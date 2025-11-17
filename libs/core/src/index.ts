/**
 * @smappy/core - Side-effect free bundle analysis core
 *
 * This package provides pure functions for analyzing JavaScript/TypeScript bundles
 * without any file system I/O or other side effects.
 *
 * @packageDocumentation
 */

// Types
export type {
  BundleInput,
  ChunkInput,
  ModuleInput,
  SourceMap,
  ParsedSymbol,
  ParsedDependency,
  SizeInfo,
} from "./types.ts";

export {
  createMockBundleInput,
  createMockChunkInput,
  createMockModuleInput,
  createMockParsedSymbol,
  createMockParsedDependency,
  createMockSizeInfo,
} from "./types.ts";

// AST Analysis
export type {
  SymbolWithExport,
  AnalysisResult,
  AnalyzerOptions,
} from "./ast/index.ts";

export {
  extractSymbols,
  analyzeFunctions,
  analyzeClasses,
} from "./ast/index.ts";

// Dependency Graph
export type {
  BuilderOptions,
  ResolvedModule,
  DependencyGraph,
  PackageMetadata,
} from "./graph/index.ts";

export {
  buildDependencyGraph,
  resolveModule,
  findCircularDependencies,
  isThirdPartyModule,
  extractPackageName,
} from "./graph/index.ts";

// Size Calculation
export {
  computeRawSize,
  computeGzipSize,
  aggregateChunkSizes,
  aggregateBundleSizes,
} from "./size/index.ts";

// Source Map Processing
export type {
  Position,
  PositionMapping,
  SymbolFragment,
} from "./source-map/index.ts";

export {
  parseSourceMap,
  mapBundleToSource,
  computeSymbolFragments,
  computeSymbolFragmentsWithContent,
  loadExternalSourceMap,
} from "./source-map/index.ts";
