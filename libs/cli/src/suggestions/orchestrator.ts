/**
 * Suggestion analyzer orchestrator
 * Runs all registered rules and aggregates suggestions
 */

import type {
  SuggestionContext,
  SuggestionRule,
  SuggestionRuleRegistry,
} from "./types.ts";
import type { SuggestionData } from "../ingestion/db/writer.ts";
import { createRuleRegistry } from "./registry.ts";

/**
 * Suggestion analyzer orchestrator
 * Manages rule execution and suggestion aggregation
 */
export class SuggestionAnalyzer {
  private registry: SuggestionRuleRegistry;

  constructor(registry?: SuggestionRuleRegistry) {
    this.registry = registry ?? createRuleRegistry();
  }

  /**
   * Get the rule registry
   */
  getRegistry(): SuggestionRuleRegistry {
    return this.registry;
  }

  /**
   * Analyze the provided context and generate suggestions
   * @param context - Analysis context
   * @returns Array of all suggestions from all rules
   */
  async analyze(context: SuggestionContext): Promise<SuggestionData[]> {
    const rules = this.registry.getAllRules();
    const allSuggestions: SuggestionData[] = [];

    for (const rule of rules) {
      try {
        const suggestions = await rule.execute(context);
        allSuggestions.push(...suggestions);
      } catch (error) {
        // Log error but continue with other rules
        console.error(`Error executing rule ${rule.id}:`, error);
      }
    }

    return allSuggestions;
  }

  /**
   * Register a rule
   */
  registerRule(rule: SuggestionRule): void {
    this.registry.register(rule);
  }

  /**
   * Unregister a rule by ID
   */
  unregisterRule(id: string): void {
    this.registry.unregister(id);
  }
}

/**
 * Create a new suggestion analyzer instance
 */
export function createSuggestionAnalyzer(): SuggestionAnalyzer {
  return new SuggestionAnalyzer();
}
