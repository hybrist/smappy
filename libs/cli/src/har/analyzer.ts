import { analyzeSyntax } from './syntax-attribution.ts';
import type { SyntaxCategorySummary } from './syntax-attribution.ts';
import type { HarWarning, ScriptResource } from './types.ts';

export interface AnalyzerCategoryResult {
  id: string;
  label: string;
  bytes: number;
  characters: number;
  percentage: number;
  occurrences: number;
}

export interface AnalyzerResult {
  totalBytes: number;
  totalScripts: number;
  categories: AnalyzerCategoryResult[];
  warnings: HarWarning[];
}

export function analyzeScripts(scripts: ScriptResource[]): AnalyzerResult {
  const warnings: HarWarning[] = [];
  const totals = new Map<string, AnalyzerCategoryResult>();
  let totalBytes = 0;

  for (const script of scripts) {
    totalBytes += script.bytes;
    let syntaxCategories: SyntaxCategorySummary[];
    try {
      const syntax = analyzeSyntax(script.body);
      syntaxCategories = syntax.categories;
    } catch (error) {
      warnings.push({
        type: 'parse-error',
        message: 'Unable to parse JavaScript for syntax attribution',
        url: script.url,
        details: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const category of syntaxCategories) {
      const existing = totals.get(category.id);
      if (existing) {
        existing.bytes += category.bytes;
        existing.characters += category.characters;
        existing.occurrences += category.occurrences;
      } else {
        totals.set(category.id, {
          id: category.id,
          label: category.label,
          bytes: category.bytes,
          characters: category.characters,
          percentage: 0,
          occurrences: category.occurrences,
        });
      }
    }
  }

  const categories = Array.from(totals.values()).sort(
    (a, b) => b.bytes - a.bytes,
  );
  for (const category of categories) {
    category.percentage = totalBytes ? (category.bytes / totalBytes) * 100 : 0;
  }

  return {
    totalBytes,
    totalScripts: scripts.length,
    categories,
    warnings,
  };
}
