/**
 * Suggestion analyzer module
 * Provides extensible rule-based suggestion generation
 */

export {
  SuggestionAnalyzer,
  createSuggestionAnalyzer,
} from './orchestrator.ts';
export { createRuleRegistry } from './registry.ts';
export type {
  SuggestionContext,
  SuggestionRule,
  SuggestionRuleRegistry,
} from './types.ts';

// Re-export rules
export * from './rules/index.ts';
