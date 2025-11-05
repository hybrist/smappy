/**
 * Database writer module
 * Handles transaction-safe persistence of analysis results to the database
 */

import { db } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import type { IngestionOptions, ModuleInput, ChunkInput, BundleInput } from '../types/index.js';
import type { SymbolWithExport } from '../ast/analyzer.js';
import type { SymbolFragment } from '../source-map/processor.js';

// ============================================================================
// Input Types for Writer Functions
// ============================================================================

/**
 * Complete data payload for database ingestion
 * This represents all the analyzed data ready to be persisted
 */
export interface IngestionData {
  /** Ingestion options (project name, bundler type, etc.) */
  options: IngestionOptions;
  /** Bundle metadata and content */
  bundles: BundleWithMetadata[];
  /** Module metadata with analysis results */
  modules: ModuleWithAnalysis[];
  /** Chunk metadata */
  chunks: ChunkInput[];
  /** Dependency relationships */
  dependencies: DependencyRelationship[];
  /** AI-generated suggestions (optional) */
  suggestions?: SuggestionData[];
}

/**
 * Bundle with computed size metadata
 */
export interface BundleWithMetadata extends BundleInput {
  /** Raw size in bytes */
  size: number;
  /** Gzipped size in bytes */
  gzipSize: number;
}

/**
 * Module with full analysis results
 */
export interface ModuleWithAnalysis extends ModuleInput {
  /** Original size on disk */
  originalSize: number;
  /** Size in bundle (may differ due to tree-shaking) */
  bundledSize: number;
  /** Whether this is a third-party module */
  isThirdParty: boolean;
  /** Package name if third-party */
  packageName?: string;
  /** Package version if available */
  packageVersion?: string;
  /** Extracted symbols from AST analysis */
  symbols: SymbolWithExport[];
  /** Symbol fragments mapped to bundle byte ranges */
  symbolFragments: Map<string, SymbolFragment[]>;
  /** Exported symbols */
  exports?: string[];
  /** Used exports (for tree-shaking analysis) */
  usedExports?: string[];
}

/**
 * Dependency relationship between modules
 */
export interface DependencyRelationship {
  /** Source module path (importer) */
  importerPath: string;
  /** Target module path (imported) */
  importedPath: string;
  /** Import type */
  type: 'static' | 'dynamic';
  /** Imported symbol names */
  importedSymbols?: string[];
}

/**
 * AI-generated suggestion data
 */
export interface SuggestionData {
  /** Suggestion type */
  type: string;
  /** Severity level */
  severity: 'critical' | 'warning' | 'info';
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Linked entities (modules, symbols, etc.) */
  links?: Array<{
    entityType: 'Module' | 'Symbol' | 'Dependency' | 'Chunk';
    entityPath?: string; // Will be resolved to ID during write
  }>;
}

/**
 * Result of ingestion write operation
 */
export interface IngestionWriteResult {
  /** Created analysis run ID */
  analysisRunId: number;
  /** Summary statistics */
  stats: {
    modulesWritten: number;
    symbolsWritten: number;
    dependenciesWritten: number;
    chunksWritten: number;
    bundlesWritten: number;
    sourceMapEntriesWritten: number;
    suggestionsWritten: number;
  };
}

// ============================================================================
// Main Write Function
// ============================================================================

/**
 * Write complete ingestion data to database with transaction safety
 *
 * This is the main entry point for persisting analysis results.
 * All writes are performed in a single transaction to ensure atomicity.
 *
 * @param data - Complete ingestion data
 * @returns Result with analysis run ID and statistics
 * @throws Error if transaction fails (all changes will be rolled back)
 */
export async function writeIngestionData(data: IngestionData): Promise<IngestionWriteResult> {
  // better-sqlite3 with drizzle handles transactions synchronously
  // We'll use db.transaction() for atomicity
  return db.transaction((tx) => {
    const stats = {
      modulesWritten: 0,
      symbolsWritten: 0,
      dependenciesWritten: 0,
      chunksWritten: 0,
      bundlesWritten: 0,
      sourceMapEntriesWritten: 0,
      suggestionsWritten: 0,
    };

    // Step 1: Write analysis run (root entity)
    const analysisRunId = writeAnalysisRun(tx, data.options);

    // Step 2: Write modules (needed for foreign keys)
    const moduleIdMap = writeModules(tx, analysisRunId, data.modules);
    stats.modulesWritten = moduleIdMap.size;

    // Step 3: Write symbols for each module
    const symbolIdMap = writeSymbols(tx, data.modules, moduleIdMap);
    stats.symbolsWritten = symbolIdMap.size;

    // Step 4: Write bundles
    const bundleIdMap = writeBundles(tx, analysisRunId, data.bundles);
    stats.bundlesWritten = bundleIdMap.size;

    // Step 5: Write source map entries (links symbols to bundle byte ranges)
    stats.sourceMapEntriesWritten = writeSourceMapEntries(
      tx,
      data.modules,
      moduleIdMap,
      symbolIdMap,
      bundleIdMap,
    );

    // Step 6: Write chunks
    const chunkIdMap = writeChunks(tx, analysisRunId, data.chunks);
    stats.chunksWritten = chunkIdMap.size;

    // Step 7: Write chunk-module relationships
    writeChunkModules(tx, data.chunks, chunkIdMap, moduleIdMap);

    // Step 8: Write dependencies
    stats.dependenciesWritten = writeDependencies(
      tx,
      analysisRunId,
      data.dependencies,
      moduleIdMap,
    );

    // Step 9: Write suggestions (optional, placeholder for now)
    if (data.suggestions && data.suggestions.length > 0) {
      stats.suggestionsWritten = writeSuggestions(
        tx,
        analysisRunId,
        data.suggestions,
        moduleIdMap,
        symbolIdMap,
      );
    }

    return { analysisRunId, stats };
  });
}

// ============================================================================
// Individual Write Functions
// ============================================================================

/**
 * Write analysis run entry
 */
function writeAnalysisRun(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  options: IngestionOptions,
): number {
  const result = tx
    .insert(schema.analysisRun)
    .values({
      projectName: options.projectName,
      bundler: options.bundlerType,
    })
    .returning({ id: schema.analysisRun.id })
    .get();

  return result.id;
}

/**
 * Write modules and return path->ID mapping
 */
function writeModules(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  analysisRunId: number,
  modules: ModuleWithAnalysis[],
): Map<string, number> {
  const moduleIdMap = new Map<string, number>();

  if (modules.length === 0) {
    return moduleIdMap;
  }

  // Batch insert all modules
  for (const module of modules) {
    const result = tx
      .insert(schema.module)
      .values({
        analysisRunId,
        filePath: module.filePath,
        fileType: module.fileType,
        originalSize: module.originalSize,
        bundledSize: module.bundledSize,
        isThirdParty: module.isThirdParty,
        packageName: module.packageName,
        packageVersion: module.packageVersion,
        exports: module.exports ? JSON.stringify(module.exports) : null,
        usedExports: module.usedExports ? JSON.stringify(module.usedExports) : null,
      })
      .returning({ id: schema.module.id })
      .get();

    moduleIdMap.set(module.filePath, result.id);
  }

  return moduleIdMap;
}

/**
 * Write symbols for all modules
 */
function writeSymbols(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  modules: ModuleWithAnalysis[],
  moduleIdMap: Map<string, number>,
): Map<string, number> {
  const symbolIdMap = new Map<string, number>();

  for (const module of modules) {
    const moduleId = moduleIdMap.get(module.filePath);
    if (!moduleId || !module.symbols || module.symbols.length === 0) {
      continue;
    }

    for (const symbol of module.symbols) {
      // Compute AST hash if not present
      const astHash = `${module.filePath}:${symbol.name}:${symbol.type}`;

      const result = tx
        .insert(schema.symbol)
        .values({
          moduleId,
          name: symbol.name,
          type: symbol.type,
          sourceStartLine: symbol.location.start.line,
          sourceStartCol: symbol.location.start.column,
          sourceEndLine: symbol.location.end.line,
          sourceEndCol: symbol.location.end.column,
          astHash,
          isExported: symbol.exportType !== undefined,
          computedBundledSize: 0, // Will be computed from source map entries
          computedGzipSize: 0, // Will be computed from source map entries
        })
        .returning({ id: schema.symbol.id })
        .get();

      // Use a composite key for symbol lookup
      const symbolKey = `${module.filePath}:${symbol.name}`;
      symbolIdMap.set(symbolKey, result.id);
    }
  }

  return symbolIdMap;
}

/**
 * Write bundles and return filename->ID mapping
 */
function writeBundles(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  analysisRunId: number,
  bundles: BundleWithMetadata[],
): Map<string, number> {
  const bundleIdMap = new Map<string, number>();

  if (bundles.length === 0) {
    return bundleIdMap;
  }

  for (const bundle of bundles) {
    const result = tx
      .insert(schema.bundle)
      .values({
        analysisRunId,
        fileName: bundle.fileName,
        fileType: bundle.type,
        size: bundle.size,
        gzipSize: bundle.gzipSize,
      })
      .returning({ id: schema.bundle.id })
      .get();

    bundleIdMap.set(bundle.fileName, result.id);
  }

  return bundleIdMap;
}

/**
 * Write source map entries that link symbols to bundle byte ranges
 */
function writeSourceMapEntries(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  modules: ModuleWithAnalysis[],
  moduleIdMap: Map<string, number>,
  symbolIdMap: Map<string, number>,
  bundleIdMap: Map<string, number>,
): number {
  let entriesWritten = 0;

  // For now, we'll assume a single bundle (main bundle)
  // In a real scenario, the orchestrator should specify which bundle each fragment belongs to
  const firstBundleId = Array.from(bundleIdMap.values())[0];
  if (!firstBundleId) {
    return 0;
  }

  for (const module of modules) {
    if (!module.symbolFragments || module.symbolFragments.size === 0) {
      continue;
    }

    for (const [symbolName, fragments] of module.symbolFragments.entries()) {
      const symbolKey = `${module.filePath}:${symbolName}`;
      const symbolId = symbolIdMap.get(symbolKey);

      if (!symbolId) {
        continue;
      }

      for (const fragment of fragments) {
        tx.insert(schema.sourceMapEntry)
          .values({
            bundleId: firstBundleId,
            symbolId,
            byteLength: fragment.size,
          })
          .run();

        entriesWritten++;
      }
    }
  }

  return entriesWritten;
}

/**
 * Write chunks and return name->ID mapping
 */
function writeChunks(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  analysisRunId: number,
  chunks: ChunkInput[],
): Map<string, number> {
  const chunkIdMap = new Map<string, number>();

  if (chunks.length === 0) {
    return chunkIdMap;
  }

  for (const chunk of chunks) {
    const result = tx
      .insert(schema.chunk)
      .values({
        analysisRunId,
        name: chunk.name,
        totalSize: 0, // Will be computed from module sizes
        isEntry: chunk.isEntry,
        isAsync: chunk.isAsync,
      })
      .returning({ id: schema.chunk.id })
      .get();

    chunkIdMap.set(chunk.name, result.id);
  }

  return chunkIdMap;
}

/**
 * Write chunk-module relationships (many-to-many junction table)
 */
function writeChunkModules(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  chunks: ChunkInput[],
  chunkIdMap: Map<string, number>,
  moduleIdMap: Map<string, number>,
): void {
  for (const chunk of chunks) {
    const chunkId = chunkIdMap.get(chunk.name);
    if (!chunkId) {
      continue;
    }

    for (const moduleId of chunk.moduleIds) {
      const dbModuleId = moduleIdMap.get(moduleId);
      if (!dbModuleId) {
        continue;
      }

      tx.insert(schema.chunkModule)
        .values({
          chunkId,
          moduleId: dbModuleId,
        })
        .run();
    }
  }
}

/**
 * Write dependencies between modules
 */
function writeDependencies(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  analysisRunId: number,
  dependencies: DependencyRelationship[],
  moduleIdMap: Map<string, number>,
): number {
  let dependenciesWritten = 0;

  for (const dep of dependencies) {
    const importerId = moduleIdMap.get(dep.importerPath);
    const importedId = moduleIdMap.get(dep.importedPath);

    if (!importerId || !importedId) {
      // Skip if either module not found
      continue;
    }

    tx.insert(schema.dependency)
      .values({
        analysisRunId,
        importerModuleId: importerId,
        importedModuleId: importedId,
        importType: dep.type,
        importedSymbols: dep.importedSymbols ? JSON.stringify(dep.importedSymbols) : null,
      })
      .run();

    dependenciesWritten++;
  }

  return dependenciesWritten;
}

/**
 * Write AI-generated suggestions (placeholder implementation)
 */
function writeSuggestions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  analysisRunId: number,
  suggestions: SuggestionData[],
  _moduleIdMap: Map<string, number>,
  _symbolIdMap: Map<string, number>,
): number {
  let suggestionsWritten = 0;

  for (const suggestion of suggestions) {
    tx.insert(schema.suggestion)
      .values({
        analysisRunId,
        type: suggestion.type,
        severity: suggestion.severity,
        title: suggestion.title,
        description: suggestion.description,
      })
      .run();

    // TODO: Write suggestion links (requires entity ID resolution)
    // For now, we'll skip this as it requires more complex mapping

    suggestionsWritten++;
  }

  return suggestionsWritten;
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Retrieve the most recent analysis run for a project
 * @param projectName - Project name
 * @returns Analysis run ID or null if not found
 */
export async function getPreviousAnalysisRun(projectName: string): Promise<number | null> {
  const { eq, desc } = await import('drizzle-orm');

  const result = await db
    .select({ id: schema.analysisRun.id })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.projectName, projectName))
    .orderBy(desc(schema.analysisRun.createdAt))
    .limit(1);

  return result.length > 0 ? result[0].id : null;
}
