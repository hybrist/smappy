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
    expect(classCategory?.bytes).toBeGreaterThan(0);
    expect(functionCategory?.bytes).toBeGreaterThan(0);
    const totalPercent = result.categories.reduce(
      (sum, category) => sum + category.percentage,
      0,
    );
    // Allow rounding error.
    expect(Math.round(totalPercent)).toBeCloseTo(100, 1);
  });
});
