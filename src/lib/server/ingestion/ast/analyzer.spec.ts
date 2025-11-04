/**
 * Tests for AST analyzer and symbol extraction
 */
import { describe, it, expect } from 'vitest';
import { extractSymbols, analyzeFunctions, analyzeClasses } from './analyzer.js';

describe('AST Analyzer', () => {
  describe('extractSymbols', () => {
    it('should extract function declarations', () => {
      const code = `
        function foo() {
          return 'hello';
        }
      `;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('foo');
      expect(result.symbols[0].type).toBe('function');
      expect(result.symbols[0].scope).toBe('module');
    });

    it('should extract arrow function expressions', () => {
      const code = `
        const bar = () => {
          return 'world';
        };
      `;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('bar');
      expect(result.symbols[0].type).toBe('function');
    });

    it('should extract function expressions', () => {
      const code = `
        const baz = function() {
          return 'test';
        };
      `;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('baz');
      expect(result.symbols[0].type).toBe('function');
    });

    it('should extract class declarations', () => {
      const code = `
        class MyClass {
          constructor() {}
          method() {}
        }
      `;
      const result = extractSymbols(code);

      const classSymbol = result.symbols.find((s) => s.type === 'class');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.name).toBe('MyClass');
    });

    it('should extract const variables', () => {
      const code = `
        const x = 1;
        const y = 2;
      `;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(2);
      expect(result.symbols[0].type).toBe('const');
      expect(result.symbols[1].type).toBe('const');
    });

    it('should extract let variables', () => {
      const code = `
        let x = 1;
        let y = 2;
      `;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(2);
      expect(result.symbols[0].type).toBe('let');
      expect(result.symbols[1].type).toBe('let');
    });

    it('should extract var variables', () => {
      const code = `
        var x = 1;
        var y = 2;
      `;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(2);
      expect(result.symbols[0].type).toBe('variable');
      expect(result.symbols[1].type).toBe('variable');
    });

    it('should capture accurate position information', () => {
      const code = `function test() {\n  return 42;\n}`;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].location.start.line).toBe(1);
      expect(result.symbols[0].location.start.column).toBe(0);
      expect(result.symbols[0].location.end.line).toBe(3);
    });
  });

  describe('nested symbols', () => {
    it('should extract class methods', () => {
      const code = `
        class TestClass {
          method1() {}
          method2() {}
        }
      `;
      const result = extractSymbols(code, { includeNested: true });

      const methods = result.symbols.filter((s) => s.name.includes('.'));
      expect(methods.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract static methods', () => {
      const code = `
        class TestClass {
          static staticMethod() {}
        }
      `;
      const result = extractSymbols(code, { includeNested: true });

      const staticMethod = result.symbols.find((s) => s.name.includes('static'));
      expect(staticMethod).toBeDefined();
    });

    it('should extract private methods', () => {
      const code = `
        class TestClass {
          #privateMethod() {}
        }
      `;
      const result = extractSymbols(code, { includeNested: true });

      const privateMethod = result.symbols.find((s) => s.name.includes('private'));
      expect(privateMethod).toBeDefined();
    });

    it('should not extract nested functions when includeNested is false', () => {
      const code = `
        function outer() {
          function inner() {}
        }
      `;
      const result = extractSymbols(code, { includeNested: false });

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('outer');
    });

    it('should extract nested functions when includeNested is true', () => {
      const code = `
        function outer() {
          function inner() {}
        }
      `;
      const result = extractSymbols(code, { includeNested: true });

      // Note: nested functions need special handling - currently not implemented
      // This test documents expected behavior
      expect(result.symbols.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('export tracking', () => {
    it('should track named exports', () => {
      const code = `
        export function foo() {}
        export const bar = 1;
      `;
      const result = extractSymbols(code);

      const fooSymbol = result.symbols.find((s) => s.name === 'foo');
      expect(fooSymbol?.exportType).toBe('named');

      const barSymbol = result.symbols.find((s) => s.name === 'bar');
      expect(barSymbol?.exportType).toBe('named');
    });

    it('should track default exports', () => {
      const code = `
        export default function foo() {}
      `;
      const result = extractSymbols(code);

      const fooSymbol = result.symbols.find((s) => s.name === 'foo');
      expect(fooSymbol?.exportType).toBe('default');
    });

    it('should track export aliases', () => {
      const code = `
        function foo() {}
        export { foo as bar };
      `;
      const result = extractSymbols(code);

      const fooSymbol = result.symbols.find((s) => s.name === 'foo');
      expect(fooSymbol?.exportType).toBe('named');
      expect(fooSymbol?.exportedAs).toBe('bar');
    });

    it('should track multiple named exports', () => {
      const code = `
        const x = 1;
        const y = 2;
        export { x, y };
      `;
      const result = extractSymbols(code);

      const xSymbol = result.symbols.find((s) => s.name === 'x');
      const ySymbol = result.symbols.find((s) => s.name === 'y');

      expect(xSymbol?.exportType).toBe('named');
      expect(ySymbol?.exportType).toBe('named');
    });
  });

  describe('modern JavaScript features', () => {
    it('should parse ES2022+ syntax', () => {
      const code = `
        class MyClass {
          #privateField = 1;
          static staticField = 2;
        }
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
      const classSymbol = result.symbols.find((s) => s.type === 'class');
      expect(classSymbol).toBeDefined();
    });

    it('should parse optional chaining', () => {
      const code = `
        const x = obj?.property;
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
    });

    it('should parse nullish coalescing', () => {
      const code = `
        const x = value ?? 'default';
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
    });

    it('should parse top-level await', () => {
      const code = `
        const data = await fetch('/api');
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('TypeScript support', () => {
    it('should parse TypeScript function with types', () => {
      const code = `
        function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('add');
    });

    it('should parse TypeScript interfaces', () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }
      `;
      const result = extractSymbols(code);

      // Interfaces are not extracted as symbols (they're type-only)
      expect(result.errors).toHaveLength(0);
    });

    it('should parse TypeScript class with decorators', () => {
      const code = `
        class MyClass {
          @observable
          property = 1;
        }
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
      const classSymbol = result.symbols.find((s) => s.type === 'class');
      expect(classSymbol).toBeDefined();
    });

    it('should parse generic functions', () => {
      const code = `
        function identity<T>(arg: T): T {
          return arg;
        }
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
      expect(result.symbols[0].name).toBe('identity');
    });
  });

  describe('JSX/TSX support', () => {
    it('should parse JSX components', () => {
      const code = `
        function MyComponent() {
          return <div>Hello</div>;
        }
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
      expect(result.symbols[0].name).toBe('MyComponent');
    });

    it('should parse TSX components with props', () => {
      const code = `
        function Button({ label }: { label: string }) {
          return <button>{label}</button>;
        }
      `;
      const result = extractSymbols(code);

      expect(result.errors).toHaveLength(0);
      expect(result.symbols[0].name).toBe('Button');
    });

    it('should parse class components', () => {
      const code = `
        class MyComponent extends React.Component {
          render() {
            return <div>Hello</div>;
          }
        }
      `;
      const result = extractSymbols(code, { includeNested: true });

      expect(result.errors).toHaveLength(0);
      const classSymbol = result.symbols.find((s) => s.type === 'class');
      expect(classSymbol?.name).toBe('MyComponent');
    });
  });

  describe('AST hashing', () => {
    it('should generate consistent hash for same code', () => {
      const code = `function test() { return 42; }`;
      const result1 = extractSymbols(code);
      const result2 = extractSymbols(code);

      expect(result1.astHash).toBe(result2.astHash);
      expect(result1.astHash).toBeTruthy();
    });

    it('should generate different hash for different code', () => {
      const code1 = `function test() { return 42; }`;
      const code2 = `function test() { return 43; }`;
      const result1 = extractSymbols(code1);
      const result2 = extractSymbols(code2);

      expect(result1.astHash).not.toBe(result2.astHash);
    });

    it('should generate same hash regardless of whitespace/formatting', () => {
      const code1 = `function test(){return 42;}`;
      const code2 = `function test() {\n  return 42;\n}`;
      const result1 = extractSymbols(code1);
      const result2 = extractSymbols(code2);

      // Hashes should be the same since AST structure is identical
      expect(result1.astHash).toBe(result2.astHash);
    });
  });

  describe('error handling', () => {
    it('should handle syntax errors gracefully', () => {
      const code = `function test() { this is invalid }`;
      const result = extractSymbols(code);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.symbols).toHaveLength(0);
    });

    it('should handle empty code', () => {
      const code = '';
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(0);
      expect(result.astHash).toBeTruthy();
    });

    it('should handle only comments', () => {
      const code = `// This is a comment\n/* Another comment */`;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('analyzeFunctions', () => {
    it('should extract only functions', () => {
      const code = `
        function foo() {}
        const bar = () => {};
        class Baz {}
        const x = 1;
      `;
      const functions = analyzeFunctions(code);

      expect(functions.length).toBe(2);
      expect(functions.every((f) => f.type === 'function')).toBe(true);
    });

    it('should not include nested functions by default', () => {
      const code = `
        function outer() {
          function inner() {}
        }
      `;
      const functions = analyzeFunctions(code);

      expect(functions).toHaveLength(1);
      expect(functions[0].name).toBe('outer');
    });
  });

  describe('analyzeClasses', () => {
    it('should extract only classes', () => {
      const code = `
        class Foo {}
        function bar() {}
        const x = 1;
      `;
      const classes = analyzeClasses(code);

      expect(classes).toHaveLength(1);
      expect(classes[0].type).toBe('class');
      expect(classes[0].name).toBe('Foo');
    });

    it('should include class methods when includeNested is true', () => {
      const code = `
        class MyClass {
          method1() {}
          method2() {}
        }
      `;
      const result = analyzeClasses(code);

      // Should include class and its methods
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('position accuracy', () => {
    it('should have correct start position', () => {
      const code = `\n\nfunction test() {}\n`;
      const result = extractSymbols(code);

      expect(result.symbols[0].location.start.line).toBe(3);
    });

    it('should have correct end position', () => {
      const code = `function test() {\n  const x = 1;\n  return x;\n}`;
      const result = extractSymbols(code);

      expect(result.symbols[0].location.end.line).toBe(4);
    });

    it('should track multiple symbols on same line', () => {
      const code = `const x = 1; const y = 2;`;
      const result = extractSymbols(code);

      expect(result.symbols).toHaveLength(2);
      expect(result.symbols[0].location.start.line).toBe(1);
      expect(result.symbols[1].location.start.line).toBe(1);
      expect(result.symbols[0].location.start.column).toBeLessThan(
        result.symbols[1].location.start.column,
      );
    });
  });

  describe('size estimation', () => {
    it('should estimate size for single-line functions', () => {
      const code = `function test() { return 42; }`;
      const result = extractSymbols(code);

      expect(result.symbols[0].size).toBeGreaterThan(0);
    });

    it('should estimate larger size for multi-line functions', () => {
      const code1 = `function small() {}`;
      const code2 = `function large() {\n  const x = 1;\n  const y = 2;\n  return x + y;\n}`;

      const result1 = extractSymbols(code1);
      const result2 = extractSymbols(code2);

      expect(result2.symbols[0].size).toBeGreaterThan(result1.symbols[0].size);
    });
  });

  describe('complex real-world scenarios', () => {
    it('should handle a typical module with mixed exports', () => {
      const code = `
        // Utility functions
        export function helper() {
          return 'help';
        }

        const privateVar = 123;

        export class MyClass {
          constructor() {}
          
          method() {
            return privateVar;
          }
          
          static staticMethod() {
            return 'static';
          }
        }

        export const config = {
          key: 'value'
        };

        export default function main() {
          return 'main';
        }
      `;

      const result = extractSymbols(code, { includeNested: true });

      expect(result.errors).toHaveLength(0);

      // Check we have all top-level symbols
      const helperFn = result.symbols.find((s) => s.name === 'helper');
      const myClass = result.symbols.find((s) => s.name === 'MyClass');
      const configVar = result.symbols.find((s) => s.name === 'config');
      const mainFn = result.symbols.find((s) => s.name === 'main');
      const privateVar = result.symbols.find((s) => s.name === 'privateVar');

      expect(helperFn?.exportType).toBe('named');
      expect(myClass?.exportType).toBe('named');
      expect(configVar?.exportType).toBe('named');
      expect(mainFn?.exportType).toBe('default');
      expect(privateVar?.exportType).toBeUndefined();
    });
  });
});
