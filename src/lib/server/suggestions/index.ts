/**
 * Suggestion analyzer module
 * Provides extensible rule-based suggestion generation
 */

export { SuggestionAnalyzer, createSuggestionAnalyzer } from './orchestrator.js';
export { createRuleRegistry } from './registry.js';
export type { SuggestionContext, SuggestionRule, SuggestionRuleRegistry } from './types.js';
