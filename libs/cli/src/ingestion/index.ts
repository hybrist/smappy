/**
 * Bundle ingestion module for CLI
 * Provides the main API for analyzing and persisting bundle data
 */

// Re-export the main ingestion function
export { ingestBundle } from "./orchestrator.ts";

// Re-export input/output types
export type {
  BundleIngestionInput,
  BundleIngestionResult,
} from "./orchestrator.ts";

// Re-export shared types from db writer
export type {
  IngestionOptions,
  IngestionData,
  IngestionWriteResult,
  ModuleWithAnalysis,
  BundleWithMetadata,
  DependencyRelationship,
  SuggestionData,
} from "./db/writer.ts";

export { createMockIngestionOptions } from "./db/writer.ts";

// Re-export core types from @smappy/core for convenience
export type {
  BundleInput,
  ChunkInput,
  ModuleInput,
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
