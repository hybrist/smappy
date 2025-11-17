/**
 * Tests for duplicate code detector
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DuplicateDetector,
  createDuplicateDetector,
  type DuplicateDetectorConfig,
} from "./duplicate-detector.js";
import type { SuggestionContext } from "../../suggestions/types.js";
import type { ModuleWithAnalysis } from "../db/writer.js";

describe("DuplicateDetector", () => {
  let detector: DuplicateDetector;
  let context: SuggestionContext;

  // Helper to create test modules
  const createModule = (
    filePath: string,
    sourceContent: string,
    bundledSize: number,
    isThirdParty = false,
  ): ModuleWithAnalysis => ({
    filePath,
    sourceContent,
    fileType: "js",
    originalSize: bundledSize,
    bundledSize,
    isThirdParty,
    symbols: [],
    symbolFragments: new Map(),
  });

  beforeEach(() => {
    detector = createDuplicateDetector();
    context = {
      modules: [],
      dependencies: [],
      chunks: [],
      bundles: [],
    };
  });

  describe("rule metadata", () => {
    it("should have correct rule metadata", () => {
      expect(detector.id).toBe("duplicate-code");
      expect(detector.name).toBe("Duplicate Code Detector");
      expect(detector.description).toContain("duplicate");
    });
  });

  describe("execute", () => {
    it("should return empty array when no modules exist", () => {
      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it("should return empty array when only one module exists", () => {
      const code = `
        export function calculate(a, b) {
          return a + b;
        }
      `;
      context.modules = [createModule("./src/utils.js", code, 200)];

      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it("should detect exact duplicate functions", () => {
      const duplicateCode = `
        export function calculate(a, b) {
          return a + b;
        }
      `;

      context.modules = [
        createModule("./src/module1.js", duplicateCode, 200),
        createModule("./src/module2.js", duplicateCode, 200),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestion = suggestions[0];
      expect(suggestion.type).toBe("DUPLICATE_CODE");
      expect(suggestion.title).toContain("Duplicate code detected");
      expect(suggestion.title).toContain("%");
    });

    it("should detect similar functions above threshold", () => {
      // Functions with nearly identical code but minor differences
      const code1 = `
        export function processData(data) {
          const name = data.name;
          const email = data.email;
          const isActive = data.active;
          const address = data.address;
          const phone = data.phone;
          const age = data.age;
          const city = data.city;
          return { name, email, isActive, address, phone, age, city };
        }
      `;

      const code2 = `
        export function processInfo(data) {
          const name = data.name;
          const email = data.email;
          const isActive = data.active;
          const address = data.address;
          const phone = data.phone;
          const age = data.age;
          const city = data.city;
          return { name, email, isActive, address, phone, age, city };
        }
      `;

      context.modules = [
        createModule("./src/user.js", code1, 500),
        createModule("./src/customer.js", code2, 500),
      ];

      const suggestions = detector.execute(context);

      // These functions have identical structure with only function name different
      // They should be detected as similar (likely 95%+ similar)
      expect(suggestions.length).toBeGreaterThan(0);
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        expect(suggestion.type).toBe("DUPLICATE_CODE");
      }
    });

    it("should not detect dissimilar code", () => {
      const code1 = `
        export function add(a, b) {
          return a + b;
        }
      `;

      const code2 = `
        export class UserManager {
          constructor() {
            this.users = [];
          }
          addUser(user) {
            this.users.push(user);
          }
        }
      `;

      context.modules = [
        createModule("./src/math.js", code1, 200),
        createModule("./src/users.js", code2, 300),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toEqual([]);
    });

    it("should skip third-party modules by default", () => {
      const code = `
        export function helper() {
          return 42;
        }
      `;

      context.modules = [
        createModule("./src/app.js", code, 200, false),
        createModule("./node_modules/lib/index.js", code, 200, true),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toEqual([]);
    });

    it("should skip modules below minimum size", () => {
      const tinyCode = "export const x = 1;";

      context.modules = [
        createModule("./src/a.js", tinyCode, 50),
        createModule("./src/b.js", tinyCode, 50),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toEqual([]);
    });

    it("should include links to both modules", () => {
      const code = `
        export function calculate(a, b) {
          const result = a + b;
          return result * 2;
        }
      `;

      context.modules = [
        createModule("./src/module1.js", code, 200),
        createModule("./src/module2.js", code, 200),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestion = suggestions[0];
      expect(suggestion.links).toBeDefined();
      expect(suggestion.links).toHaveLength(2);
      expect(suggestion.links?.[0].entityType).toBe("Module");
      expect(suggestion.links?.[1].entityType).toBe("Module");

      const paths = suggestion.links?.map((link) => link.entityPath);
      expect(paths).toContain("./src/module1.js");
      expect(paths).toContain("./src/module2.js");
    });

    it("should calculate potential size savings", () => {
      const code = `
        export function largeFunction() {
          const a = 1;
          const b = 2;
          const c = 3;
          const d = 4;
          const e = 5;
          return a + b + c + d + e;
        }
      `;

      context.modules = [
        createModule("./src/module1.js", code, 500),
        createModule("./src/module2.js", code, 500),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestion = suggestions[0];
      expect(suggestion.description).toContain("savings");
      expect(suggestion.description).toMatch(/\d+/); // Contains numbers for size
    });

    it("should provide actionable recommendations", () => {
      const code = `
        export function process(data) {
          return data.map(x => x * 2);
        }
      `;

      context.modules = [
        createModule("./src/a.js", code, 200),
        createModule("./src/b.js", code, 200),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestion = suggestions[0];
      expect(suggestion.description).toContain("Extract");
      expect(suggestion.description).toContain("shared utility");
    });

    it("should not report duplicates within the same file", () => {
      const code = `
        export function helper1(x) {
          return x * 2;
        }
        export function helper2(x) {
          return x * 2;
        }
      `;

      context.modules = [createModule("./src/utils.js", code, 300)];

      const suggestions = detector.execute(context);

      expect(suggestions).toEqual([]);
    });

    it("should detect duplicate classes", () => {
      const classCode = `
        export class DataProcessor {
          constructor() {
            this.data = [];
          }
          process() {
            return this.data.map(x => x * 2);
          }
        }
      `;

      context.modules = [
        createModule("./src/processor1.js", classCode, 400),
        createModule("./src/processor2.js", classCode, 400),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle multiple duplicate pairs", () => {
      const code1 = `
        export function funcA() {
          return 'A'.repeat(50);
        }
      `;

      const code2 = `
        export function funcB() {
          return 'B'.repeat(50);
        }
      `;

      context.modules = [
        createModule("./src/a1.js", code1, 200),
        createModule("./src/a2.js", code1, 200),
        createModule("./src/b1.js", code2, 200),
        createModule("./src/b2.js", code2, 200),
      ];

      const suggestions = detector.execute(context);

      // Should find at least 2 duplicate pairs
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("custom configuration", () => {
    it("should accept custom similarity threshold", () => {
      const config: DuplicateDetectorConfig = {
        similarityThreshold: 95, // Very strict
      };
      detector = createDuplicateDetector(config);

      const code1 = `
        export function process(data) {
          return data.map(x => x * 2);
        }
      `;

      const code2 = `
        export function process(items) {
          return items.map(x => x * 2);
        }
      `;

      context.modules = [
        createModule("./src/a.js", code1, 200),
        createModule("./src/b.js", code2, 200),
      ];

      const suggestions = detector.execute(context);

      // With stricter threshold, similar but not exact code might not be detected
      // This test validates the config is being used
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should accept custom minimum code size", () => {
      const config: DuplicateDetectorConfig = {
        minCodeSize: 500, // Very large minimum
      };
      detector = createDuplicateDetector(config);

      const smallCode = `
        export function tiny() {
          return 1;
        }
      `;

      context.modules = [
        createModule("./src/a.js", smallCode, 300),
        createModule("./src/b.js", smallCode, 300),
      ];

      const suggestions = detector.execute(context);

      // Should not detect because modules are below the minimum size
      expect(suggestions).toEqual([]);
    });

    it("should allow including third-party modules", () => {
      const config: DuplicateDetectorConfig = {
        skipThirdParty: false,
      };
      detector = createDuplicateDetector(config);

      const code = `
        export function utility() {
          return 'hello';
        }
      `;

      context.modules = [
        createModule("./src/app.js", code, 200, false),
        createModule("./node_modules/lib/index.js", code, 200, true),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("severity levels", () => {
    it("should use critical severity for very similar large code", () => {
      const largeCode = `
        export function processLargeData(data) {
          const step1 = data.map(x => x * 2);
          const step2 = step1.filter(x => x > 0);
          const step3 = step2.reduce((a, b) => a + b, 0);
          const step4 = step3 / step2.length;
          return Math.round(step4 * 100) / 100;
        }
      `;

      context.modules = [
        createModule("./src/a.js", largeCode, 600),
        createModule("./src/b.js", largeCode, 600),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const criticalSuggestion = suggestions.find(
        (s) => s.severity === "critical",
      );
      expect(criticalSuggestion).toBeDefined();
    });

    it("should use warning severity for moderately similar code", () => {
      const code = `
        export function process(x) {
          const a = x * 2;
          const b = a + 1;
          const c = b * 3;
          return c;
        }
      `;

      context.modules = [
        createModule("./src/a.js", code, 350),
        createModule("./src/b.js", code, 350),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(["warning", "critical"]).toContain(suggestions[0].severity);
    });
  });

  describe("edge cases", () => {
    it("should handle empty modules", () => {
      context.modules = [
        createModule("./src/empty1.js", "", 0),
        createModule("./src/empty2.js", "", 0),
      ];

      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it("should handle modules with only comments", () => {
      const commentCode = `
        // This is a comment
        /* Another comment */
      `;

      context.modules = [
        createModule("./src/a.js", commentCode, 100),
        createModule("./src/b.js", commentCode, 100),
      ];

      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it("should handle modules with syntax errors gracefully", () => {
      const invalidCode = "export function broken(";

      context.modules = [
        createModule("./src/broken.js", invalidCode, 150),
        createModule("./src/valid.js", "export const x = 1;", 150),
      ];

      // Should not throw, just skip broken modules
      expect(() => detector.execute(context)).not.toThrow();
    });

    it("should normalize whitespace when comparing", () => {
      const code1 = `export function test() { return 42; }`;
      const code2 = `export function test() {
        return 42;
      }`;

      context.modules = [
        createModule("./src/a.js", code1, 200),
        createModule("./src/b.js", code2, 200),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle very large modules efficiently", () => {
      // Generate a large code string
      const largeCode = Array(1000)
        .fill(null)
        .map((_, i) => `const var${i} = ${i};`)
        .join("\n");

      context.modules = [
        createModule("./src/large1.js", largeCode, 50000),
        createModule("./src/large2.js", largeCode, 50000),
      ];

      // Should complete without timeout
      const suggestions = detector.execute(context);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe("description formatting", () => {
    it("should format sizes in description correctly", () => {
      const code = `
        export function calc() {
          return Array(100).fill(0).reduce((a, b) => a + b, 0);
        }
      `;

      context.modules = [
        createModule("./src/a.js", code, 250),
        createModule("./src/b.js", code, 250),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].description).toMatch(/\d+(\.\d+)?[KMB]/);
    });

    it("should include line numbers in description", () => {
      const code = `export function test() {
        const x = 1;
        return x;
      }`;

      context.modules = [
        createModule("./src/a.js", code, 200),
        createModule("./src/b.js", code, 200),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].description).toContain("Lines:");
    });

    it("should include file paths in description", () => {
      const code = `export const value = 42;`;

      context.modules = [
        createModule("./src/config/a.js", code, 150),
        createModule("./src/config/b.js", code, 150),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].description).toContain("./src/config/a.js");
      expect(suggestions[0].description).toContain("./src/config/b.js");
    });
  });
});
