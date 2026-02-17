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
    expect(classCategory?.bytes).toBeGreaterThan(0);
    expect(stringCategory?.occurrences).toBeGreaterThanOrEqual(2);
    expect(templateCategory?.occurrences).toBe(1);
    expect(importCategory?.occurrences).toBe(3);
    const totalCategoryBytes = analysis.categories.reduce(
      (sum, item) => sum + item.bytes,
      0,
    );
    expect(totalCategoryBytes).toBe(analysis.bytes);
  });
});
