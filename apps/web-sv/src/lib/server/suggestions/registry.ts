/**
 * Suggestion rule registry
 * Manages registration and retrieval of suggestion rules
 */

import type { SuggestionRule, SuggestionRuleRegistry } from './types.js';

/**
 * Default implementation of SuggestionRuleRegistry
 */
class DefaultRuleRegistry implements SuggestionRuleRegistry {
  private rules: Map<string, SuggestionRule> = new Map();

  register(rule: SuggestionRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id "${rule.id}" is already registered`);
    }
    this.rules.set(rule.id, rule);
  }

  getAllRules(): SuggestionRule[] {
    return Array.from(this.rules.values());
  }

  getRule(id: string): SuggestionRule | undefined {
    return this.rules.get(id);
  }

  unregister(id: string): void {
    this.rules.delete(id);
  }

  clear(): void {
    this.rules.clear();
  }

  /**
   * Get the number of registered rules
   */
  getRuleCount(): number {
    return this.rules.size;
  }
}

/**
 * Create a new rule registry instance
 */
export function createRuleRegistry(): SuggestionRuleRegistry {
  return new DefaultRuleRegistry();
}
