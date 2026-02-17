import { describe, expect, it } from 'vitest';
import { analyzeSyntax } from './syntax-attribution.ts';

describe('analyzeSyntax', () => {
  it('categorizes major syntax constructs', () => {
    const code =
      `
      import { useMemo } from 'react';
      export class Widget {
        constructor() {
          this.label = 'Hello';
        }
        render() {
          const data = ['a', "b"].map((value) => value.toUpperCase());
          return data.join(',');
        }
      }
      export function helper() {
        return ` +
      '`value:${Math.random()}`' +
      `;
      }
    `;

    const analysis = analyzeSyntax(code);
    const classCategory = analysis.categories.find(
      (item) => item.id === 'class',
    );
    const stringCategory = analysis.categories.find(
      (item) => item.id === 'string_literal',
    );
    const templateCategory = analysis.categories.find(
      (item) => item.id === 'template_literal',
    );
    const importCategory = analysis.categories.find(
      (item) => item.id === 'import_export',
    );

    expect(analysis.bytes).toBeGreaterThan(0);
    expect(classCategory?.ownBytes).toBeGreaterThan(0);
    expect(stringCategory?.occurrences).toBeGreaterThanOrEqual(2);
    expect(templateCategory?.occurrences).toBe(1);
    expect(importCategory?.occurrences).toBe(3);
    const totalCategoryBytes = analysis.categories.reduce(
      (sum, item) => sum + item.ownBytes,
      0,
    );
    expect(totalCategoryBytes).toBe(analysis.bytes);
  });

  it('separates object literal methods into their own category', () => {
    const code = 'const obj = { foo() { return 1; } };';
    const analysis = analyzeSyntax(code, {
      categories: ['method', 'object_method', 'function'],
    });

    const objectMethodCategory = analysis.categories.find(
      (item) => item.id === 'object_method',
    );
    const functionCategory = analysis.categories.find(
      (item) => item.id === 'function',
    );

    expect(objectMethodCategory?.occurrences).toBe(1);
    expect(functionCategory).toBeUndefined();
  });

  it('attributes class shells (fields, static blocks) exactly to classes', () => {
    const methodSource = 'baz() { return this.bar; }';
    const classPrefix = 'class Foo { bar = 1; static { this.bar; } ';
    const classSuffix = ' }';
    const code = `${classPrefix}${methodSource}${classSuffix}`;
    const analysis = analyzeSyntax(code, {
      categories: ['class', 'method'],
    });

    const classCategory = analysis.categories.find(
      (item) => item.id === 'class',
    );
    const methodCategory = analysis.categories.find(
      (item) => item.id === 'method',
    );

    const methodBytes = Buffer.byteLength(methodSource, 'utf8');
    const totalBytes = Buffer.byteLength(code, 'utf8');
    const classBytes = Buffer.byteLength(classPrefix + classSuffix, 'utf8');
    const expectedClassBytes = totalBytes - methodBytes;

    expect(methodCategory?.ownBytes).toBe(methodBytes);
    expect(classCategory?.ownBytes).toBe(classBytes);
    expect(classCategory?.ownBytes).toBe(expectedClassBytes);
    expect(classCategory?.totalBytes).toBe(totalBytes);
  });

  it('detects bundled module object methods', () => {
    const code =
      'const chunk = { 43623(e,t,n){return e+t+n;}, foo(){return 1;} };';
    const analysis = analyzeSyntax(code, {
      categories: ['bundle_module', 'object_method'],
    });

    const bundle = analysis.categories.find(
      (item) => item.id === 'bundle_module',
    );
    const objectMethod = analysis.categories.find(
      (item) => item.id === 'object_method',
    );

    expect(bundle?.occurrences).toBe(1);
    expect(objectMethod?.occurrences).toBe(1);
  });
});
