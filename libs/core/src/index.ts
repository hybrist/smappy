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
} from './types.js';

export {
  createMockBundleInput,
  createMockChunkInput,
  createMockModuleInput,
  createMockParsedSymbol,
  createMockParsedDependency,
  createMockSizeInfo,
} from './types.js';

// AST Analysis
export type {
  SymbolWithExport,
  AnalysisResult,
  AnalyzerOptions,
} from './ast/index.js';

export {
  extractSymbols,
  analyzeFunctions,
  analyzeClasses,
} from './ast/index.js';

// Dependency Graph
export type {
  BuilderOptions,
  ResolvedModule,
  DependencyGraph,
  PackageMetadata,
} from './graph/index.js';

export {
  buildDependencyGraph,
  resolveModule,
  findCircularDependencies,
  isThirdPartyModule,
  extractPackageName,
} from './graph/index.js';

// Size Calculation
export {
  computeRawSize,
  computeGzipSize,
  aggregateChunkSizes,
  aggregateBundleSizes,
} from './size/index.js';

// Source Map Processing
export type {
  Position,
  PositionMapping,
  SymbolFragment,
} from './source-map/index.js';

export {
  parseSourceMap,
  mapBundleToSource,
  computeSymbolFragments,
  computeSymbolFragmentsWithContent,
  loadExternalSourceMap,
} from './source-map/index.js';
