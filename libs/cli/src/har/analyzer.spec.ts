import { describe, expect, it } from 'vitest';
import { analyzeScripts } from './analyzer.ts';

describe('analyzeScripts', () => {
  it('aggregates category percentages', () => {
    const body = `class Alpha { method() { return 'value'; } }
    function beta() { return Alpha; }
    `;
    const result = analyzeScripts([
      {
        url: 'https://example.com/app.js',
        body,
        mimeType: 'application/javascript',
        bytes: Buffer.byteLength(body, 'utf8'),
        pageRef: 'page_1',
      },
    ]);

    expect(result.totalScripts).toBe(1);
    const classCategory = result.categories.find(
      (category) => category.id === 'class',
    );
    const functionCategory = result.categories.find(
      (category) => category.id === 'function',
    );
    expect(classCategory?.ownBytes).toBeGreaterThan(0);
    expect(functionCategory?.ownBytes).toBeGreaterThan(0);
    const totalPercent = result.categories.reduce(
      (sum, category) => sum + category.ownPercentage,
      0,
    );
    // Allow rounding error.
    expect(Math.round(totalPercent)).toBeCloseTo(100, 1);
  });

  it('supports core mode with top-level bucket', () => {
    const body = `class Foo { x() { return 1; } }
      const helper = () => Foo;
      console.log(helper);
    `;
    const result = analyzeScripts(
      [
        {
          url: 'https://example.com/app.js',
          body,
          mimeType: 'application/javascript',
          bytes: Buffer.byteLength(body, 'utf8'),
          pageRef: 'page_1',
        },
      ],
      { mode: 'core' },
    );

    const ids = result.categories.map((category) => category.id);
    expect(ids).toEqual(
      expect.arrayContaining(['class', 'function', 'method', 'top_level']),
    );
    const topLevel = result.categories.find(
      (category) => category.id === 'top_level',
    );
    expect(topLevel?.totalBytes).toBeGreaterThan(0);
    const classBucket = result.categories.find(
      (category) => category.id === 'class',
    );
    expect(classBucket?.ownBytes).toBeGreaterThan(0);
  });

  it('separates object literal methods from class methods', () => {
    const body = `class Foo { bar() { return 1; } }
      const obj = { baz() { return 2; } };
    `;
    const result = analyzeScripts(
      [
        {
          url: 'https://example.com/app.js',
          body,
          mimeType: 'application/javascript',
          bytes: Buffer.byteLength(body, 'utf8'),
          pageRef: 'page_1',
        },
      ],
      { mode: 'core' },
    );

    const methodCategory = result.categories.find(
      (category) => category.id === 'method',
    );
    const objectMethodCategory = result.categories.find(
      (category) => category.id === 'object_method',
    );

    expect(methodCategory?.occurrences).toBe(1);
    expect(objectMethodCategory?.occurrences).toBe(1);
  });

  it('detects bundled module object methods only in full mode', () => {
    const body = `const chunk = { 43623(e,t,n){ return e+t+n; }, util(){ return 1; } };`;
    const scripts = [
      {
        url: 'https://example.com/app.js',
        body,
        mimeType: 'application/javascript',
        bytes: Buffer.byteLength(body, 'utf8'),
        pageRef: 'page_1',
      },
    ];

    const fullResult = analyzeScripts(scripts);
    const bundleCategory = fullResult.categories.find(
      (category) => category.id === 'bundle_module',
    );
    expect(bundleCategory?.occurrences).toBe(1);

    const coreResult = analyzeScripts(scripts, { mode: 'core' });
    expect(
      coreResult.categories.find((category) => category.id === 'bundle_module'),
    ).toBeUndefined();
  });
});
