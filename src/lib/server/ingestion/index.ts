/**
 * Main orchestrator for bundle ingestion system
 * Coordinates the analysis pipeline from bundle input to database persistence
 */

import type { BundleInput, ChunkInput, ModuleInput, IngestionOptions } from './types/index.js';
import type {
  IngestionData,
  IngestionWriteResult,
  ModuleWithAnalysis,
  BundleWithMetadata,
  DependencyRelationship,
  SuggestionData,
} from './db/writer.js';
import { extractSymbols, type SymbolWithExport } from './ast/analyzer.js';
import {
  parseSourceMap,
  mapBundleToSource,
  computeSymbolFragmentsWithContent,
  type SymbolFragment,
} from './source-map/processor.js';
import { buildDependencyGraph } from './graph/builder.js';
import { computeRawSize, computeGzipSize } from './size/calculator.js';
import { writeIngestionData } from './db/writer.js';
import {
  computeIncrementalDiff,
  shouldReanalyze,
  type IncrementalDiff,
} from './incremental/index.js';
import { createSuggestionAnalyzer } from '../suggestions/orchestrator.js';
import type { SuggestionContext } from '../suggestions/types.js';
import { LLMAnalyzer } from './suggestions/llm-analyzer.js';

// ============================================================================
// Main Orchestrator API
// ============================================================================

/**
 * Complete bundle ingestion input
 */
export interface BundleIngestionInput {
  /** Ingestion options */
  options: IngestionOptions;
  /** Bundles to analyze */
  bundles: BundleInput[];
  /** Source modules */
  modules: ModuleInput[];
  /** Chunks (code-split entry points) */
  chunks: ChunkInput[];
}

/**
 * Result of bundle ingestion
 */
export interface BundleIngestionResult extends IngestionWriteResult {
  /** Analysis run ID */
  analysisRunId: number;
  /** Statistics */
  stats: {
    modulesWritten: number;
    symbolsWritten: number;
    dependenciesWritten: number;
    chunksWritten: number;
    bundlesWritten: number;
    sourceMapEntriesWritten: number;
    suggestionsWritten: number;
    modulesSkipped?: number;
  };
  /** Errors encountered during processing (non-fatal) */
  errors: string[];
  /** Incremental diff information (if incremental mode enabled) */
  diff?: IncrementalDiff;
}

/**
 * Main entry point for bundle ingestion
 *
 * Coordinates all analysis modules and persists results to database:
 * 1. AST analysis for symbol extraction
 * 2. Source map processing for position mapping
 * 3. Dependency graph building
 * 4. Size calculations (raw + gzip)
 * 5. Database writes
 *
 * @param input - Bundle ingestion input
 * @returns Result with analysis run ID and statistics
 * @throws Error if critical failure occurs
 */
export async function ingestBundle(input: BundleIngestionInput): Promise<BundleIngestionResult> {
  const errors: string[] = [];
  let diff: IncrementalDiff | undefined;
  let modulesToAnalyze = input.modules;
  let modulesSkipped = 0;

  try {
    // Step 0: Compute incremental diff if enabled
    if (input.options.enableIncremental && input.options.projectName) {
      console.log(`[Ingestion] Computing incremental diff...`);

      // Perform lightweight analysis to get symbol names for diff computation
      const symbolsForDiff = new Map<string, SymbolWithExport[]>();
      for (const module of input.modules) {
        try {
          const analysisResult = extractSymbols(module.sourceContent, {
            sourceType: 'module',
            includeNested: false, // Lightweight for diff only
            filePath: module.filePath,
          });
          symbolsForDiff.set(module.filePath, analysisResult.symbols);
        } catch {
          // Skip if analysis fails
          symbolsForDiff.set(module.filePath, []);
        }
      }

      diff = await computeIncrementalDiff(input.options.projectName, input.modules, symbolsForDiff);

      // Filter modules that need re-analysis
      modulesToAnalyze = input.modules.filter((module) => shouldReanalyze(module.filePath, diff!));
      modulesSkipped = input.modules.length - modulesToAnalyze.length;

      console.log(
        `[Ingestion] Incremental: ${modulesToAnalyze.length} to analyze, ${modulesSkipped} skipped`,
      );
    }

    // Step 1: Analyze modules (only those that changed in incremental mode)
    console.log(`[Ingestion] Analyzing ${modulesToAnalyze.length} modules...`);
    const analyzedModules = await analyzeModules(modulesToAnalyze, input.bundles, errors);

    // Step 2: Build dependency graph (only for changed modules)
    console.log(`[Ingestion] Building dependency graph...`);
    const dependencies = await buildDependencies(modulesToAnalyze, errors);

    // Step 3: Process bundles
    console.log(`[Ingestion] Processing ${input.bundles.length} bundles...`);
    const processedBundles = await processBundles(input.bundles, errors);

    // Step 4: Prepare ingestion data
    const ingestionData: IngestionData = {
      options: input.options,
      bundles: processedBundles,
      modules: analyzedModules,
      chunks: input.chunks,
      dependencies,
    };

    const aiSuggestions = await generateAISuggestions(ingestionData);
    if (aiSuggestions.length > 0) {
      ingestionData.suggestions = aiSuggestions;
    }

    // Step 5: Write to database
    console.log(`[Ingestion] Writing to database...`);
    const result = await writeIngestionData(ingestionData);

    console.log(`[Ingestion] ✓ Complete! Analysis run ID: ${result.analysisRunId}`);
    console.log(`[Ingestion] Stats:`, { ...result.stats, modulesSkipped });

    return {
      ...result,
      stats: {
        ...result.stats,
        modulesSkipped,
      },
      errors,
      diff,
    };
  } catch (error) {
    console.error('[Ingestion] ✗ Fatal error:', error);
    throw error;
  }
}

// ============================================================================
// Module Analysis
// ============================================================================

/**
 * Analyze all modules: extract symbols, compute sizes, map to bundle positions
 */
async function analyzeModules(
  modules: ModuleInput[],
  bundles: BundleInput[],
  errors: string[],
): Promise<ModuleWithAnalysis[]> {
  const analyzed: ModuleWithAnalysis[] = [];

  // Get first bundle for source map processing (simplified for now)
  const mainBundle = bundles[0];
  let sourceMap = null;
  let mappings = null;

  if (mainBundle?.sourceMapReference) {
    try {
      sourceMap = parseSourceMap(mainBundle.sourceMapReference);
      mappings = mapBundleToSource(mainBundle.content, sourceMap);
    } catch (error) {
      errors.push(`Failed to parse source map: ${error}`);
    }
  }

  for (const module of modules) {
    try {
      // Extract symbols from source code
      const analysisResult = extractSymbols(module.sourceContent, {
        sourceType: 'module',
        includeNested: true,
        filePath: module.filePath,
      });

      if (analysisResult.errors.length > 0) {
        errors.push(`Errors analyzing ${module.filePath}: ${analysisResult.errors.join(', ')}`);
      }

      // Compute module sizes
      const originalSize = computeRawSize(module.sourceContent);
      const bundledSize = originalSize; // Simplified - would compute from source map

      // Map symbols to bundle positions
      const symbolFragments = new Map<string, SymbolFragment[]>();
      if (mappings && mainBundle) {
        for (const symbol of analysisResult.symbols) {
          try {
            const fragment = computeSymbolFragmentsWithContent(
              {
                name: symbol.name,
                location: symbol.location,
              },
              mainBundle.content,
              mappings,
            );
            if (fragment) {
              symbolFragments.set(symbol.name, [fragment]);
            }
          } catch (error) {
            // Non-fatal: symbol mapping failure
            errors.push(`Failed to map symbol ${symbol.name} in ${module.filePath}: ${error}`);
          }
        }
      }

      // Detect third-party modules
      const isThirdParty = module.filePath.includes('node_modules');
      let packageName: string | undefined;
      let packageVersion: string | undefined;

      if (isThirdParty) {
        const match = module.filePath.match(/node_modules\/(?:@([^/]+)\/)?([^/]+)/);
        if (match) {
          packageName = match[1] ? `@${match[1]}/${match[2]}` : match[2];
        }
      }

      // Extract exported symbols
      const exports = analysisResult.symbols
        .filter((s) => s.exportType !== undefined)
        .map((s) => s.name);

      analyzed.push({
        ...module,
        originalSize,
        bundledSize,
        isThirdParty,
        packageName,
        packageVersion,
        symbols: analysisResult.symbols,
        symbolFragments,
        exports: exports.length > 0 ? exports : undefined,
        usedExports: undefined, // Would be computed from tree-shaking analysis
      });
    } catch (error) {
      errors.push(`Fatal error analyzing ${module.filePath}: ${error}`);
      // Add stub module to maintain data integrity
      analyzed.push({
        ...module,
        originalSize: 0,
        bundledSize: 0,
        isThirdParty: false,
        symbols: [],
        symbolFragments: new Map(),
      });
    }
  }

  return analyzed;
}

// ============================================================================
// Dependency Graph
// ============================================================================

/**
 * Build dependency graph from all modules
 */
async function buildDependencies(
  modules: ModuleInput[],
  errors: string[],
): Promise<DependencyRelationship[]> {
  const dependencies: DependencyRelationship[] = [];
  const moduleMap = new Map(modules.map((m) => [m.filePath, m]));

  for (const module of modules) {
    try {
      const graph = buildDependencyGraph(module.sourceContent, module.filePath, {
        baseDir: process.cwd(),
        followDynamicImports: true,
      });

      // Convert graph dependencies to database format
      for (const dep of graph.dependencies) {
        // Resolve target path relative to importing module
        const targetPath = resolveRelativePath(module.filePath, dep.target);
        const targetModule = moduleMap.get(targetPath);

        if (!targetModule) {
          // Skip unresolved dependencies (external modules, etc.)
          continue;
        }

        dependencies.push({
          importerPath: module.filePath,
          importedPath: targetPath,
          type: dep.type === 'dynamic-import' ? 'dynamic' : 'static',
          importedSymbols: dep.importedNames,
        });
      }
    } catch (error) {
      errors.push(`Failed to build dependency graph for ${module.filePath}: ${error}`);
    }
  }

  return dependencies;
}

/**
 * Resolve a relative import path against the importing module's path
 */
function resolveRelativePath(fromPath: string, importPath: string): string {
  // If not a relative import, return as-is
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return importPath;
  }

  // Get directory of importing file
  const fromParts = fromPath.split('/');
  fromParts.pop(); // Remove filename

  // Process import path
  const importParts = importPath.split('/');

  for (const part of importParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      fromParts.pop();
    } else {
      fromParts.push(part);
    }
  }

  return fromParts.join('/');
}

// ============================================================================
// Bundle Processing
// ============================================================================

/**
 * Process bundles: compute sizes
 */
async function processBundles(
  bundles: BundleInput[],
  errors: string[],
): Promise<BundleWithMetadata[]> {
  const processed: BundleWithMetadata[] = [];

  for (const bundle of bundles) {
    try {
      const size = computeRawSize(bundle.content);
      const gzipSize = await computeGzipSize(bundle.content);

      processed.push({
        ...bundle,
        size,
        gzipSize,
      });
    } catch (error) {
      errors.push(`Failed to process bundle ${bundle.fileName}: ${error}`);
      // Add stub bundle
      processed.push({
        ...bundle,
        size: 0,
        gzipSize: 0,
      });
    }
  }

  return processed;
}

async function generateAISuggestions(ingestionData: IngestionData): Promise<SuggestionData[]> {
  try {
    const analyzer = createSuggestionAnalyzer();
    analyzer.registerRule(new LLMAnalyzer());

    const context: SuggestionContext = {
      modules: ingestionData.modules,
      dependencies: ingestionData.dependencies,
      chunks: ingestionData.chunks,
      bundles: ingestionData.bundles,
    };

    return await analyzer.analyze(context);
  } catch (error) {
    console.error('[Ingestion] Failed to generate AI suggestions', error);
    return [];
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

// Re-export input types from types module
export type { BundleInput, ChunkInput, ModuleInput, IngestionOptions } from './types/index.js';

// Re-export result types from db writer
export type {
  IngestionData,
  IngestionWriteResult,
  ModuleWithAnalysis,
  BundleWithMetadata,
  DependencyRelationship,
} from './db/writer.js';

export type {
  // Analysis types
  SymbolWithExport,
  AnalysisResult,
} from './ast/analyzer.js';

export type {
  // Source map types
  SymbolFragment,
  PositionMapping,
} from './source-map/processor.js';

export type {
  // Dependency types
  DependencyGraph,
  ResolvedModule,
} from './graph/builder.js';

// Re-export internal types (for backwards compatibility with old tests)
export type { ParsedSymbol, ParsedDependency, SizeInfo } from './types/index.js';

// Re-export test helpers
export {
  createMockBundleInput,
  createMockChunkInput,
  createMockModuleInput,
  createMockIngestionOptions,
  createMockParsedSymbol,
  createMockParsedDependency,
  createMockSizeInfo,
} from './types/index.js';
