import { analyzeSyntax } from './syntax-attribution.ts';
import type {
  ScriptSyntaxAnalysis,
  SyntaxCategoryId,
  SyntaxCategorySummary,
  Segment,
  CategoryStats,
} from './syntax-attribution.ts';
import type { HarWarning, ScriptResource } from './types.ts';

export type AnalyzerMode = 'full' | 'core';

export interface AnalyzerOptions {
  mode?: AnalyzerMode;
}

export interface AnalyzerCategoryResult {
  id: string;
  label: string;
  ownBytes: number;
  ownPercentage: number;
  totalBytes: number;
  totalPercentage: number;
  occurrences: number;
  stats?: CategoryStats;
}

type AggregatedCategory = AnalyzerCategoryResult & { samples: number[] };

export interface AnalyzerResult {
  totalBytes: number;
  totalScripts: number;
  categories: AnalyzerCategoryResult[];
  warnings: HarWarning[];
}

const DEFAULT_MODE: AnalyzerMode = 'full';
const CORE_SYNTAX_CATEGORIES: SyntaxCategoryId[] = [
  'method',
  'object_method',
  'function',
  'class',
];

export function analyzeScripts(
  scripts: ScriptResource[],
  options: AnalyzerOptions = {},
): AnalyzerResult {
  const warnings: HarWarning[] = [];
  const totals = new Map<string, AggregatedCategory>();
  const mode = options.mode ?? DEFAULT_MODE;
  let totalBytes = 0;

  for (const script of scripts) {
    totalBytes += script.bytes;
    let syntax: ScriptSyntaxAnalysis;
    try {
      syntax = analyzeSyntax(script.body, {
        categories: mode === 'core' ? CORE_SYNTAX_CATEGORIES : undefined,
        includeCoverage: mode === 'core',
      });
    } catch (error) {
      warnings.push({
        type: 'parse-error',
        message: 'Unable to parse JavaScript for syntax attribution',
        url: script.url,
        details: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (mode === 'core') {
      const summaries = buildCoreSummaries(syntax, script.bytes);
      accumulateCategories(totals, summaries);
      continue;
    }

    const summaries = syntax.categories.map(toAnalyzerCategory);
    accumulateCategories(totals, summaries);
  }

  const categories = finalizeCategories(totals, totalBytes);

  return {
    totalBytes,
    totalScripts: scripts.length,
    categories,
    warnings,
  };
}

function accumulateCategories(
  totals: Map<string, AggregatedCategory>,
  categories: AggregatedCategory[],
) {
  for (const category of categories) {
    const existing = totals.get(category.id);
    if (existing) {
      existing.ownBytes += category.ownBytes;
      existing.totalBytes += category.totalBytes;
      existing.occurrences += category.occurrences;
      existing.samples.push(...category.samples);
    } else {
      totals.set(category.id, { ...category, samples: [...category.samples] });
    }
  }
}

function finalizeCategories(
  totals: Map<string, AggregatedCategory>,
  denominator: number,
) {
  const categories = Array.from(totals.values()).sort(
    (a, b) => b.ownBytes - a.ownBytes,
  );
  for (const category of categories) {
    category.ownPercentage = denominator
      ? (category.ownBytes / denominator) * 100
      : 0;
    category.totalPercentage = denominator
      ? (category.totalBytes / denominator) * 100
      : 0;
    category.stats = calculateStats(category.samples);
    delete (category as Partial<AggregatedCategory>).samples;
  }
  return categories;
}

function toAnalyzerCategory(
  summary: SyntaxCategorySummary,
): AggregatedCategory {
  return {
    id: summary.id,
    label: summary.label,
    ownBytes: summary.ownBytes,
    ownPercentage: 0,
    totalBytes: summary.totalBytes,
    totalPercentage: 0,
    occurrences: summary.occurrences,
    stats: summary.stats,
    samples: summary.samples ? [...summary.samples] : [],
  };
}

function buildCoreSummaries(
  syntax: ScriptSyntaxAnalysis,
  scriptBytes: number,
): AggregatedCategory[] {
  const coverage = syntax.coverage;
  if (!coverage) {
    throw new Error('Core summaries require coverage information');
  }

  const summaries = new Map<string, SyntaxCategorySummary>();
  for (const summary of syntax.categories) {
    summaries.set(summary.id, summary);
  }

  const method = toAnalyzerCategory(
    summaries.get('method') ?? emptySummary('method', 'Methods'),
  );
  const objectMethod = toAnalyzerCategory(
    summaries.get('object_method') ??
      emptySummary('object_method', 'Object literal methods'),
  );
  const fn = toAnalyzerCategory(
    summaries.get('function') ?? emptySummary('function', 'Functions'),
  );
  const cls = toAnalyzerCategory(
    summaries.get('class') ?? emptySummary('class', 'Classes'),
  );

  const unionLength = computeUnionLength([
    coverage.method ?? [],
    coverage.object_method ?? [],
    coverage.function ?? [],
    coverage.class ?? [],
  ]);
  const topLevelOwn = Math.max(
    0,
    scriptBytes -
      (method.ownBytes + objectMethod.ownBytes + fn.ownBytes + cls.ownBytes),
  );
  const topLevelTotal = Math.max(0, scriptBytes - unionLength);

  const topLevel: AnalyzerCategoryResult = {
    id: 'top_level',
    label: 'Top-level code',
    ownBytes: topLevelOwn,
    ownPercentage: 0,
    totalBytes: topLevelTotal,
    totalPercentage: 0,
    occurrences: topLevelOwn > 0 ? 1 : 0,
    stats: undefined,
  };
  return [method, objectMethod, fn, cls, { ...topLevel, samples: [] }];
}

function emptySummary(id: string, label: string): SyntaxCategorySummary {
  return {
    id: id as SyntaxCategoryId,
    label,
    ownBytes: 0,
    ownCharacters: 0,
    totalBytes: 0,
    totalCharacters: 0,
    occurrences: 0,
    stats: undefined,
    samples: [],
  };
}

function computeUnionLength(segmentGroups: Segment[][]): number {
  const allSegments = segmentGroups.flat();
  if (!allSegments.length) {
    return 0;
  }
  const sorted = allSegments.sort((a, b) => a.start - b.start);
  let total = 0;
  let current = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i += 1) {
    const segment = sorted[i];
    if (segment.start <= current.end) {
      current.end = Math.max(current.end, segment.end);
    } else {
      total += Math.max(0, current.end - current.start);
      current = { ...segment };
    }
  }
  total += Math.max(0, current.end - current.start);
  return total;
}

function calculateStats(values: number[]): CategoryStats | undefined {
  if (!values.length) {
    return undefined;
  }
  const n = values.length;
  const sum = values.reduce((acc, value) => acc + value, 0);
  const average = sum / n;
  const sumSquares = values.reduce((acc, value) => acc + value * value, 0);
  const variance = Math.max(0, sumSquares / n - average * average);
  const stddev = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    if (n === 1) {
      return sorted[0];
    }
    const rank = (p / 100) * (n - 1);
    const low = Math.floor(rank);
    const high = Math.min(sorted.length - 1, Math.ceil(rank));
    if (low === high) {
      return sorted[low];
    }
    const weight = rank - low;
    return sorted[low] * (1 - weight) + sorted[high] * weight;
  };

  return {
    average,
    stddev,
    p50: percentile(50),
    p90: percentile(90),
    p99: percentile(99),
  };
}
