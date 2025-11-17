/**
 * Main orchestrator for bundle ingestion system
 * Coordinates the analysis pipeline from bundle input to database persistence
 */

import type { BundleInput, ChunkInput, ModuleInput } from "@smappy/core";
import { schema } from "@smappy/store";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { posix as pathPosix } from "node:path";
import type {
  IngestionData,
  IngestionWriteResult,
  ModuleWithAnalysis,
  BundleWithMetadata,
  DependencyRelationship,
  SuggestionData,
  IngestionOptions,
} from "./db/writer.ts";
import {
  extractSymbols,
  type SymbolWithExport,
  parseSourceMap,
  mapBundleToSource,
  computeSymbolFragmentsWithContent,
  type SymbolFragment,
  buildDependencyGraph,
  computeRawSize,
  computeGzipSize,
} from "@smappy/core";
import { writeIngestionData } from "./db/writer.ts";

import { createSuggestionAnalyzer } from "../suggestions/orchestrator.ts";
import type { SuggestionContext } from "../suggestions/types.ts";
import { LLMAnalyzer } from "./suggestions/llm-analyzer.ts";

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
  };
  /** Errors encountered during processing (non-fatal) */
  errors: string[];
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
export async function ingestBundle(
  db: BetterSQLite3Database<typeof schema>,
  input: BundleIngestionInput,
): Promise<BundleIngestionResult> {
  const errors: string[] = [];

  try {
    // Step 1: Analyze modules
    console.log(`[Ingestion] Analyzing ${input.modules.length} modules...`);
    const analyzedModules = await analyzeModules(
      input.modules,
      input.bundles,
      errors,
    );

    // Step 2: Build dependency graph
    console.log(`[Ingestion] Building dependency graph...`);
    const dependencies = await buildDependencies(input.modules, errors);

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
    const result = await writeIngestionData(db, ingestionData);

    console.log(
      `[Ingestion] ✓ Complete! Analysis run ID: ${result.analysisRunId}`,
    );
    console.log(`[Ingestion] Stats:`, result.stats);

    return {
      ...result,
      errors,
    };
  } catch (error) {
    console.error("[Ingestion] ✗ Fatal error:", error);
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
        sourceType: "module",
        includeNested: true,
        filePath: module.filePath,
      });

      if (analysisResult.errors.length > 0) {
        errors.push(
          `Errors analyzing ${module.filePath}: ${analysisResult.errors.join(", ")}`,
        );
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
            errors.push(
              `Failed to map symbol ${symbol.name} in ${module.filePath}: ${error}`,
            );
          }
        }
      }

      // Detect third-party modules
      const isThirdParty = module.filePath.includes("node_modules");
      let packageName: string | undefined;
      let packageVersion: string | undefined;

      if (isThirdParty) {
        const match = module.filePath.match(
          /node_modules\/(?:@([^/]+)\/)?([^/]+)/,
        );
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
  const moduleLookup = createModuleLookup(modules);
  const importerLookup = new Map(
    modules.map((m) => [normalizeModulePath(m.filePath), m.filePath]),
  );

  for (const module of modules) {
    try {
      const graph = buildDependencyGraph(
        module.sourceContent,
        module.filePath,
        {
          baseDir: process.cwd(),
          followDynamicImports: true,
        },
      );

      // Convert graph dependencies to database format
      for (const dep of graph.dependencies) {
        const resolvedPath = resolveImportedModulePath(
          module.filePath,
          dep.target,
          moduleLookup,
        );

        if (!resolvedPath) {
          continue;
        }

        dependencies.push({
          importerPath:
            importerLookup.get(normalizeModulePath(module.filePath)) ??
            module.filePath,
          importedPath: resolvedPath,
          type: dep.type === "dynamic-import" ? "dynamic" : "static",
          importedSymbols: dep.importedNames,
        });
      }
    } catch (error) {
      errors.push(
        `Failed to build dependency graph for ${module.filePath}: ${error}`,
      );
    }
  }

  return dependencies;
}

/**
 * Resolve a module specifier to a module path known to ingestion
 */
function resolveImportedModulePath(
  importerPath: string,
  rawSpecifier: string,
  moduleLookup: Map<string, string>,
): string | null {
  const normalizedImporter = normalizeModulePath(importerPath);
  const candidateKeys = createSpecifierCandidates(
    normalizedImporter,
    rawSpecifier,
  );

  for (const key of candidateKeys) {
    const resolved = moduleLookup.get(key);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

const SUPPORTED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".svelte",
  ".css",
];

function createModuleLookup(modules: ModuleInput[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const module of modules) {
    const normalized = normalizeModulePath(module.filePath);
    addPathVariants(lookup, normalized, module.filePath);

    if (normalized.startsWith("node_modules/")) {
      const withoutPrefix = normalized.slice("node_modules/".length);
      addPathVariants(lookup, withoutPrefix, module.filePath);

      const packageName = extractPackageNameFromNodeModulesPath(withoutPrefix);
      if (packageName) {
        addLookupKey(lookup, packageName, module.filePath);
      }
    }
  }

  return lookup;
}

function addPathVariants(
  lookup: Map<string, string>,
  normalizedPath: string,
  actualPath: string,
): void {
  addLookupKey(lookup, normalizedPath, actualPath);

  const withoutDot = stripLeadingDot(normalizedPath);
  addLookupKey(lookup, withoutDot, actualPath);
  addLookupKey(lookup, addDotPrefix(withoutDot), actualPath);

  const withoutExt = stripExtension(normalizedPath);
  addLookupKey(lookup, withoutExt, actualPath);

  const withoutDotExt = stripLeadingDot(withoutExt);
  addLookupKey(lookup, withoutDotExt, actualPath);
  addLookupKey(lookup, addDotPrefix(withoutDotExt), actualPath);

  const indexBase = removeIndexFile(normalizedPath);
  if (indexBase) {
    addLookupKey(lookup, indexBase, actualPath);
    addLookupKey(lookup, stripLeadingDot(indexBase), actualPath);
    addLookupKey(lookup, addDotPrefix(stripLeadingDot(indexBase)), actualPath);
    const indexWithoutExt = stripExtension(indexBase);
    addLookupKey(lookup, indexWithoutExt, actualPath);
    addLookupKey(lookup, stripLeadingDot(indexWithoutExt), actualPath);
    addLookupKey(
      lookup,
      addDotPrefix(stripLeadingDot(indexWithoutExt)),
      actualPath,
    );
  }
}

function addLookupKey(
  lookup: Map<string, string>,
  key: string | null | undefined,
  value: string,
): void {
  if (!key) {
    return;
  }

  const normalizedKey = normalizeSpecifier(key);
  if (!normalizedKey) {
    return;
  }

  if (!lookup.has(normalizedKey)) {
    lookup.set(normalizedKey, value);
  }
}

function normalizeModulePath(pathValue: string): string {
  const normalized = normalizeSpecifier(pathValue);
  return normalized.startsWith("../") || normalized.startsWith("./")
    ? normalized
    : normalized.replace(/^\.\/+/, "");
}

function normalizeSpecifier(specifier: string): string {
  return pathPosix.normalize(specifier.replace(/\\/g, "/"));
}

function stripLeadingDot(pathValue: string): string {
  return pathValue.startsWith("./") ? pathValue.slice(2) : pathValue;
}

function stripExtension(pathValue: string): string {
  const ext = pathPosix.extname(pathValue);
  if (!ext) {
    return pathValue;
  }
  return pathValue.slice(0, -ext.length);
}

function addDotPrefix(pathValue: string): string | null {
  if (
    !pathValue ||
    pathValue.startsWith("./") ||
    pathValue.startsWith("../") ||
    pathValue.startsWith("/")
  ) {
    return null;
  }
  return `./${pathValue}`;
}

function removeIndexFile(pathValue: string): string | null {
  const match = pathValue.match(/^(.*)\/index\.[^/]+$/);
  return match ? match[1] : null;
}

function extractPackageNameFromNodeModulesPath(
  pathValue: string,
): string | null {
  if (!pathValue) {
    return null;
  }

  const parts = pathValue.split("/");
  if (parts.length === 0) {
    return null;
  }

  if (parts[0].startsWith("@") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0] || null;
}

function createSpecifierCandidates(
  importerPath: string,
  target: string,
): string[] {
  const candidates = new Set<string>();
  const importerDir = pathPosix.dirname(importerPath);
  const isRelative = target.startsWith("./") || target.startsWith("../");
  const isAbsolute = target.startsWith("/");
  const normalizedTarget = normalizeSpecifier(target);

  if (isRelative || isAbsolute) {
    const base = isAbsolute
      ? normalizedTarget
      : pathPosix.normalize(pathPosix.join(importerDir, target));
    addCandidateVariants(candidates, base);
  } else {
    addCandidateVariants(candidates, normalizedTarget);
    addCandidateVariants(candidates, `node_modules/${normalizedTarget}`);

    const packageName = extractPackageNameFromSpecifier(normalizedTarget);
    if (packageName && packageName !== normalizedTarget) {
      addCandidateVariants(candidates, packageName);
      addCandidateVariants(candidates, `node_modules/${packageName}`);
    }
  }

  return Array.from(candidates);
}

function addCandidateVariants(candidates: Set<string>, base: string): void {
  if (!base) {
    return;
  }

  const normalizedBase = normalizeSpecifier(base);
  const hasExtension = Boolean(pathPosix.extname(normalizedBase));

  candidates.add(normalizedBase);
  candidates.add(stripLeadingDot(normalizedBase));

  if (!hasExtension) {
    for (const ext of SUPPORTED_EXTENSIONS) {
      const withExt = `${normalizedBase}${ext}`;
      candidates.add(withExt);
      candidates.add(stripLeadingDot(withExt));
    }
  }

  if (!normalizedBase.endsWith("/index")) {
    const indexBase = `${normalizedBase}/index`;
    candidates.add(indexBase);
    candidates.add(stripLeadingDot(indexBase));

    for (const ext of SUPPORTED_EXTENSIONS) {
      const indexWithExt = `${indexBase}${ext}`;
      candidates.add(indexWithExt);
      candidates.add(stripLeadingDot(indexWithExt));
    }
  }
}

function extractPackageNameFromSpecifier(specifier: string): string | null {
  const normalized = normalizeSpecifier(specifier);
  if (!normalized) {
    return null;
  }

  const [first, second] = normalized.split("/");
  if (!first) {
    return null;
  }

  if (first.startsWith("@") && second) {
    return `${first}/${second}`;
  }

  return first;
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
      // If size is already provided (e.g., from webpack stats when content isn't available),
      // use it directly. Otherwise compute from content.
      let size: number;
      let gzipSize: number;

      if (bundle.content) {
        // Content is available, compute size from it
        size = computeRawSize(bundle.content);
        gzipSize = await computeGzipSize(bundle.content);
      } else if (bundle.size !== undefined) {
        // Content not available but size provided (e.g., from bundler stats)
        size = bundle.size;
        gzipSize = bundle.gzipSize ?? 0;
      } else {
        // Neither content nor size available
        size = 0;
        gzipSize = 0;
      }

      processed.push({
        ...bundle,
        size,
        gzipSize,
      });
    } catch (error) {
      errors.push(`Failed to process bundle ${bundle.fileName}: ${error}`);
      // Add stub bundle with size from bundle if available
      processed.push({
        ...bundle,
        size: bundle.size ?? 0,
        gzipSize: bundle.gzipSize ?? 0,
      });
    }
  }

  return processed;
}

async function generateAISuggestions(
  ingestionData: IngestionData,
): Promise<SuggestionData[]> {
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
    console.error("[Ingestion] Failed to generate AI suggestions", error);
    return [];
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

// Re-export input types from @smappy/core
export type { BundleInput, ChunkInput, ModuleInput } from "@smappy/core";

// Re-export result types from db writer
export type {
  IngestionData,
  IngestionWriteResult,
  ModuleWithAnalysis,
  BundleWithMetadata,
  DependencyRelationship,
  IngestionOptions,
} from "./db/writer.ts";

export { createMockIngestionOptions } from "./db/writer.ts";

// Re-export analysis types from @smappy/core
export type {
  SymbolWithExport,
  AnalysisResult,
  SymbolFragment,
  PositionMapping,
  DependencyGraph,
  ResolvedModule,
  ParsedSymbol,
  ParsedDependency,
  SizeInfo,
} from "@smappy/core";

// Re-export test helpers from @smappy/core
export {
  createMockBundleInput,
  createMockChunkInput,
  createMockModuleInput,
  createMockParsedSymbol,
  createMockParsedDependency,
  createMockSizeInfo,
} from "@smappy/core";
