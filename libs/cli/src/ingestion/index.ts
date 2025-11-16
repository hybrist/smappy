/**
 * Stub ingestion module for CLI
 * This is a placeholder until the ingestion functionality is properly integrated into the CLI.
 * The plugins reference these types but the actual ingestion happens in the web app currently.
 */

import type { BundleInput, ChunkInput, ModuleInput } from "@smappy/core";

/**
 * Options for the ingestion process
 */
export interface IngestionOptions {
  /** Type of bundler that generated this bundle */
  bundlerType:
    | "webpack"
    | "rollup"
    | "esbuild"
    | "vite"
    | "parcel"
    | "nextjs"
    | "angular"
    | "other";
  /** Name of the project being analyzed */
  projectName: string;
}

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
export interface BundleIngestionResult {
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
}

/**
 * Stub implementation - throws error if called
 * TODO: Implement actual ingestion when CLI analyze command is built
 */
export async function ingestBundle(
  _input: BundleIngestionInput,
): Promise<BundleIngestionResult> {
  throw new Error(
    "ingestBundle is not yet implemented in the CLI. This will be integrated when the analyze command is built.",
  );
}
