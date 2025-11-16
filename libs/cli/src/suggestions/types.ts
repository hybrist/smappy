/**
 * Types for the suggestion analyzer system
 */

import type {
  SuggestionData,
  ModuleWithAnalysis,
  DependencyRelationship,
} from "../ingestion/db/writer.ts";
import type { ChunkInput, BundleInput } from "@smappy/core";

/**
 * Context provided to suggestion rules for analysis
 */
export interface SuggestionContext {
  /** Modules with full analysis results */
  modules: ModuleWithAnalysis[];
  /** Dependency relationships between modules */
  dependencies: DependencyRelationship[];
  /** Chunk information */
  chunks: ChunkInput[];
  /** Bundle metadata */
  bundles: BundleInput[];
}

/**
 * Suggestion rule interface
 * Rules analyze the context and generate suggestions
 */
export interface SuggestionRule {
  /** Unique identifier for this rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Rule description */
  description: string;
  /**
   * Execute the rule and generate suggestions
   * @param context - Analysis context with modules, dependencies, etc.
   * @returns Array of suggestions (may be empty)
   */
  execute(
    context: SuggestionContext,
  ): SuggestionData[] | Promise<SuggestionData[]>;
}

/**
 * Registry for suggestion rules
 */
export interface SuggestionRuleRegistry {
  /** Register a new rule */
  register(rule: SuggestionRule): void;
  /** Get all registered rules */
  getAllRules(): SuggestionRule[];
  /** Get a rule by ID */
  getRule(id: string): SuggestionRule | undefined;
  /** Unregister a rule by ID */
  unregister(id: string): void;
  /** Clear all registered rules */
  clear(): void;
}
