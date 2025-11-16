/**
 * Tests for suggestion rule registry
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createRuleRegistry } from "./registry.js";
import type { SuggestionRule, SuggestionRuleRegistry } from "./types.js";

describe("SuggestionRuleRegistry", () => {
  let registry: SuggestionRuleRegistry;

  beforeEach(() => {
    registry = createRuleRegistry();
  });

  describe("register", () => {
    it("should register a rule", () => {
      const rule: SuggestionRule = {
        id: "test-rule",
        name: "Test Rule",
        description: "A test rule",
        execute: () => [],
      };

      registry.register(rule);
      expect(registry.getRule("test-rule")).toBe(rule);
    });

    it("should throw error when registering duplicate rule ID", () => {
      const rule1: SuggestionRule = {
        id: "duplicate",
        name: "First",
        description: "First rule",
        execute: () => [],
      };

      const rule2: SuggestionRule = {
        id: "duplicate",
        name: "Second",
        description: "Second rule",
        execute: () => [],
      };

      registry.register(rule1);
      expect(() => registry.register(rule2)).toThrow("already registered");
    });
  });

  describe("getAllRules", () => {
    it("should return empty array when no rules registered", () => {
      expect(registry.getAllRules()).toEqual([]);
    });

    it("should return all registered rules", () => {
      const rule1: SuggestionRule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First",
        execute: () => [],
      };

      const rule2: SuggestionRule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second",
        execute: () => [],
      };

      registry.register(rule1);
      registry.register(rule2);

      const rules = registry.getAllRules();
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.id)).toEqual(["rule-1", "rule-2"]);
    });
  });

  describe("getRule", () => {
    it("should return undefined for non-existent rule", () => {
      expect(registry.getRule("nonexistent")).toBeUndefined();
    });

    it("should return rule by ID", () => {
      const rule: SuggestionRule = {
        id: "test",
        name: "Test",
        description: "Test",
        execute: () => [],
      };

      registry.register(rule);
      expect(registry.getRule("test")).toBe(rule);
    });
  });

  describe("unregister", () => {
    it("should remove rule by ID", () => {
      const rule: SuggestionRule = {
        id: "test",
        name: "Test",
        description: "Test",
        execute: () => [],
      };

      registry.register(rule);
      expect(registry.getRule("test")).toBe(rule);

      registry.unregister("test");
      expect(registry.getRule("test")).toBeUndefined();
    });

    it("should not throw when unregistering non-existent rule", () => {
      expect(() => registry.unregister("nonexistent")).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove all registered rules", () => {
      const rule1: SuggestionRule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First",
        execute: () => [],
      };

      const rule2: SuggestionRule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second",
        execute: () => [],
      };

      registry.register(rule1);
      registry.register(rule2);

      expect(registry.getAllRules()).toHaveLength(2);

      registry.clear();

      expect(registry.getAllRules()).toHaveLength(0);
      expect(registry.getRule("rule-1")).toBeUndefined();
      expect(registry.getRule("rule-2")).toBeUndefined();
    });
  });
});
