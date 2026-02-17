import { parse } from '@babel/parser';
import type { Node, ObjectMethod } from '@babel/types';

export type SyntaxCategoryId =
  | 'class'
  | 'function'
  | 'method'
  | 'bundle_module'
  | 'object_method'
  | 'string_literal'
  | 'template_literal'
  | 'import_export'
  | 'object_literal'
  | 'comment'
  | 'other';

export interface SyntaxAnalysisOptions {
  categories?: SyntaxCategoryId[];
  includeCoverage?: boolean;
}

export interface CategoryStats {
  average: number;
  stddev: number;
  p50: number;
  p90: number;
  p99: number;
}

export interface SyntaxCategorySummary {
  id: SyntaxCategoryId;
  label: string;
  ownBytes: number;
  ownCharacters: number;
  totalBytes: number;
  totalCharacters: number;
  occurrences: number;
  stats?: CategoryStats;
  samples?: number[];
}

export interface ScriptSyntaxAnalysis {
  bytes: number;
  characters: number;
  categories: SyntaxCategorySummary[];
  coverage?: Record<string, Segment[]>;
}

interface Segment {
  start: number;
  end: number;
}

const CATEGORY_INFO: Record<
  Exclude<SyntaxCategoryId, 'other'>,
  { label: string; priority: number }
> = {
  string_literal: { label: 'String literals', priority: 10 },
  template_literal: { label: 'Template literals', priority: 9 },
  method: { label: 'Methods', priority: 8.5 },
  bundle_module: { label: 'Bundled modules', priority: 8 },
  object_method: { label: 'Object literal methods', priority: 7.5 },
  function: { label: 'Functions', priority: 7 },
  class: { label: 'Classes', priority: 6 },
  import_export: { label: 'Imports/exports', priority: 5 },
  object_literal: { label: 'Object literals', priority: 4 },
  comment: { label: 'Comments', priority: 1 },
};

const DEFAULT_CATEGORY_ORDER = Object.entries(CATEGORY_INFO)
  .sort((a, b) => b[1].priority - a[1].priority)
  .map(([id]) => id as Exclude<SyntaxCategoryId, 'other'>);

export function analyzeSyntax(
  source: string,
  options: SyntaxAnalysisOptions = {},
): ScriptSyntaxAnalysis {
  const categories: SyntaxCategoryId[] = (
    options.categories ? [...options.categories] : [...DEFAULT_CATEGORY_ORDER]
  ).sort((a, b) => getPriority(b) - getPriority(a));
  const categorySet = new Set(categories);
  const ast = parseSource(source);

  const groupedIntervals: Record<string, Segment[]> = {};
  const occurrences: Record<string, number> = {};
  const sampleMap: Record<string, number[]> = {};
  const classShells: Segment[] = [];
  for (const category of categories) {
    groupedIntervals[category] = [];
    occurrences[category] = 0;
    sampleMap[category] = [];
  }

  visitNode(ast.program as Node, (node) => {
    if (!hasRange(node)) {
      return;
    }

    switch (node.type) {
      case 'ClassDeclaration':
      case 'ClassExpression':
        if (categorySet.has('class')) {
          addInterval(
            groupedIntervals.class,
            node.start,
            node.end,
            occurrences,
            'class',
          );
          classShells.push(...collectClassShells(node));
          recordSample(sampleMap, 'class', source, node.start, node.end);
        }
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        if (categorySet.has('function')) {
          addInterval(
            groupedIntervals.function,
            node.start,
            node.end,
            occurrences,
            'function',
          );
          recordSample(sampleMap, 'function', source, node.start, node.end);
        }
        break;
      case 'ClassMethod':
      case 'ClassPrivateMethod':
      case 'TSDeclareMethod':
        if (categorySet.has('method')) {
          addInterval(
            groupedIntervals.method,
            node.start,
            node.end,
            occurrences,
            'method',
          );
          recordSample(sampleMap, 'method', source, node.start, node.end);
        }
        break;
      case 'ObjectMethod':
        if (isBundlerObjectMethod(node)) {
          if (categorySet.has('bundle_module')) {
            addInterval(
              groupedIntervals.bundle_module,
              node.start,
              node.end,
              occurrences,
              'bundle_module',
            );
            recordSample(
              sampleMap,
              'bundle_module',
              source,
              node.start,
              node.end,
            );
          } else if (categorySet.has('object_method')) {
            addInterval(
              groupedIntervals.object_method,
              node.start,
              node.end,
              occurrences,
              'object_method',
            );
            recordSample(
              sampleMap,
              'object_method',
              source,
              node.start,
              node.end,
            );
          }
        } else if (categorySet.has('object_method')) {
          addInterval(
            groupedIntervals.object_method,
            node.start,
            node.end,
            occurrences,
            'object_method',
          );
          recordSample(
            sampleMap,
            'object_method',
            source,
            node.start,
            node.end,
          );
        }
        break;
      case 'StringLiteral':
        if (categorySet.has('string_literal')) {
          addInterval(
            groupedIntervals.string_literal,
            node.start,
            node.end,
            occurrences,
            'string_literal',
          );
          recordSample(
            sampleMap,
            'string_literal',
            source,
            node.start,
            node.end,
          );
        }
        break;
      case 'TemplateLiteral':
        if (categorySet.has('template_literal')) {
          addInterval(
            groupedIntervals.template_literal,
            node.start,
            node.end,
            occurrences,
            'template_literal',
          );
          recordSample(
            sampleMap,
            'template_literal',
            source,
            node.start,
            node.end,
          );
        }
        break;
      case 'ImportDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
      case 'ImportExpression':
        if (categorySet.has('import_export')) {
          addInterval(
            groupedIntervals.import_export,
            node.start,
            node.end,
            occurrences,
            'import_export',
          );
          recordSample(
            sampleMap,
            'import_export',
            source,
            node.start,
            node.end,
          );
        }
        break;
      case 'ObjectExpression':
        if (categorySet.has('object_literal')) {
          addInterval(
            groupedIntervals.object_literal,
            node.start,
            node.end,
            occurrences,
            'object_literal',
          );
          recordSample(
            sampleMap,
            'object_literal',
            source,
            node.start,
            node.end,
          );
        }
        break;
      default:
        break;
    }
  });

  if (categorySet.has('comment') && Array.isArray((ast as any).comments)) {
    for (const comment of (ast as any).comments as Array<{
      start: number;
      end: number;
    }>) {
      if (
        typeof comment.start === 'number' &&
        typeof comment.end === 'number'
      ) {
        addInterval(
          groupedIntervals.comment,
          comment.start,
          comment.end,
          occurrences,
          'comment',
        );
        recordSample(sampleMap, 'comment', source, comment.start, comment.end);
      }
    }
  }

  const occupied: Segment[] = [];
  const attributed: Record<string, Segment[]> = {};
  for (const category of categories) {
    attributed[category] = [];
  }

  const coverage: Record<string, Segment[]> | undefined =
    options.includeCoverage ? {} : undefined;

  for (const category of categories) {
    const merged = mergeSegments(groupedIntervals[category] ?? []);
    if (coverage) {
      coverage[category] = merged.map((segment) => ({ ...segment }));
    }
    const available: Segment[] = [];
    for (const segment of merged) {
      const remainder = subtractSegment(segment, occupied);
      available.push(...remainder);
    }
    attributed[category] = mergeSegments(available);
    occupied.push(...available);
    occupied.sort((a, b) => a.start - b.start);
    mergeInto(occupied);
  }

  const totalBytes = Buffer.byteLength(source, 'utf8');
  const totalCharacters = source.length;
  const summaries: SyntaxCategorySummary[] = [];
  let accountedBytes = 0;
  let accountedChars = 0;

  for (const category of categories) {
    let exclusiveSegments = mergeSegments(attributed[category] ?? []);
    if (category === 'class' && classShells.length) {
      exclusiveSegments = mergeSegments(classShells);
    }
    const inclusiveSegments = mergeSegments(groupedIntervals[category] ?? []);
    const ownBytes = sumBytes(source, exclusiveSegments);
    const ownChars = sumCharacters(exclusiveSegments);
    const totalBytesForCategory = sumBytes(source, inclusiveSegments);
    const totalCharsForCategory = sumCharacters(inclusiveSegments);

    accountedBytes += ownBytes;
    accountedChars += ownChars;

    if (!ownBytes && !totalBytesForCategory) {
      continue;
    }

    const samplesForCategory = sampleMap[category] ?? [];

    summaries.push({
      id: category,
      label:
        CATEGORY_INFO[category as Exclude<SyntaxCategoryId, 'other'>]?.label ??
        category,
      ownBytes,
      ownCharacters: ownChars,
      totalBytes: totalBytesForCategory,
      totalCharacters: totalCharsForCategory,
      occurrences: occurrences[category] ?? 0,
      stats: computeStats(samplesForCategory),
      samples: samplesForCategory.length ? [...samplesForCategory] : [],
    });
  }

  const remainingBytes = Math.max(0, totalBytes - accountedBytes);
  const remainingChars = Math.max(0, totalCharacters - accountedChars);

  summaries.push({
    id: 'other',
    label: 'Other',
    ownBytes: remainingBytes,
    ownCharacters: remainingChars,
    totalBytes: remainingBytes,
    totalCharacters: remainingChars,
    occurrences: 0,
    stats: undefined,
    samples: [],
  });

  return {
    bytes: totalBytes,
    characters: totalCharacters,
    categories: summaries,
    coverage,
  };
}

function parseSource(source: string) {
  return parse(source, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'decorators-legacy',
      'dynamicImport',
      'importAssertions',
      'topLevelAwait',
    ],
    ranges: true,
  });
}

function visitNode(node: Node, visitor: (node: Node) => void) {
  const stack: Node[] = [node];
  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    visitor(current);
    for (const key of Object.keys(current as object)) {
      const value = (current as any)[key];
      if (!value) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isNode(item)) {
            stack.push(item);
          }
        }
      } else if (isNode(value)) {
        stack.push(value);
      }
    }
  }
}

function isNode(value: unknown): value is Node {
  return Boolean(value && typeof value === 'object' && 'type' in value);
}

function hasRange(node: Node): node is Node & { start: number; end: number } {
  return (
    typeof (node as any).start === 'number' &&
    typeof (node as any).end === 'number'
  );
}

function addInterval(
  list: Segment[],
  start: number,
  end: number,
  occurrences: Record<string, number>,
  category: Exclude<SyntaxCategoryId, 'other'>,
) {
  if (start >= end) {
    return;
  }
  list.push({ start, end });
  occurrences[category] = (occurrences[category] ?? 0) + 1;
}

function mergeSegments(segments: Segment[]): Segment[] {
  if (!segments.length) {
    return [];
  }
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: Segment[] = [];
  for (const segment of sorted) {
    const last = merged.at(-1);
    if (!last) {
      merged.push({ ...segment });
      continue;
    }
    if (segment.start <= last.end) {
      last.end = Math.max(last.end, segment.end);
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function collectClassShells(node: Node): Segment[] {
  if (
    typeof (node as any).start !== 'number' ||
    typeof (node as any).end !== 'number'
  ) {
    return [];
  }

  const body =
    node && typeof node === 'object' && 'body' in node
      ? ((node as any).body?.body as Node[] | undefined)
      : undefined;
  const children = body ?? [];

  let shells: Segment[] = [
    { start: (node as any).start, end: (node as any).end },
  ];
  for (const child of children) {
    if (!CLASS_CHILD_EXCLUDE.has(child.type)) {
      continue;
    }
    if (
      typeof (child as any).start !== 'number' ||
      typeof (child as any).end !== 'number'
    ) {
      continue;
    }
    const childSegment = {
      start: (child as any).start,
      end: (child as any).end,
    };
    const updated: Segment[] = [];
    for (const segment of shells) {
      updated.push(...subtractSegment(segment, [childSegment]));
    }
    shells = updated;
  }

  return shells.filter((segment) => segment.end > segment.start);
}

function subtractSegment(segment: Segment, occupied: Segment[]): Segment[] {
  if (!occupied.length) {
    return [segment];
  }

  const result: Segment[] = [];
  let cursor = segment.start;
  const end = segment.end;

  for (const taken of occupied) {
    if (taken.end <= cursor) {
      continue;
    }
    if (taken.start >= end) {
      break;
    }
    if (taken.start > cursor) {
      result.push({ start: cursor, end: Math.min(taken.start, end) });
    }
    cursor = Math.max(cursor, taken.end);
    if (cursor >= end) {
      break;
    }
  }

  if (cursor < end) {
    result.push({ start: cursor, end });
  }

  return result.filter((part) => part.end > part.start);
}

function mergeInto(segments: Segment[]) {
  segments.sort((a, b) => a.start - b.start);
  let i = 0;
  while (i < segments.length - 1) {
    const current = segments[i];
    const next = segments[i + 1];
    if (current.end >= next.start) {
      current.end = Math.max(current.end, next.end);
      segments.splice(i + 1, 1);
    } else {
      i += 1;
    }
  }
}

function sumBytes(source: string, segments: Segment[]): number {
  let total = 0;
  for (const segment of segments) {
    total += Buffer.byteLength(
      source.slice(segment.start, segment.end),
      'utf8',
    );
  }
  return total;
}

function sumCharacters(segments: Segment[]): number {
  return segments.reduce(
    (sum, segment) => sum + (segment.end - segment.start),
    0,
  );
}

export type { Segment };

function getPriority(category: SyntaxCategoryId): number {
  return (
    CATEGORY_INFO[category as Exclude<SyntaxCategoryId, 'other'>]?.priority ?? 0
  );
}

function recordSample(
  samples: Record<string, number[]>,
  category: SyntaxCategoryId,
  source: string,
  start: number,
  end: number,
) {
  if (!samples[category]) {
    samples[category] = [];
  }
  const length = Math.max(0, end - start);
  if (!length) {
    return;
  }
  samples[category].push(Buffer.byteLength(source.slice(start, end), 'utf8'));
}

function computeStats(values: number[]): CategoryStats | undefined {
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

function isBundlerObjectMethod(node: ObjectMethod): boolean {
  if (node.kind && node.kind !== 'method') {
    return false;
  }
  const key = (node as any).key;
  if (!key) {
    return false;
  }
  let numericKey = false;
  if (key.type === 'NumericLiteral') {
    numericKey = true;
  } else if (key.type === 'StringLiteral' && /^\d+$/.test(String(key.value))) {
    numericKey = true;
  } else if (
    !node.computed &&
    key.type === 'Identifier' &&
    /^\d+$/.test(key.name)
  ) {
    numericKey = true;
  }
  if (!numericKey) {
    return false;
  }
  const params = Array.isArray(node.params) ? node.params : [];
  if (params.length < 2 || params.length > 4) {
    return false;
  }
  return true;
}
const CLASS_CHILD_EXCLUDE = new Set([
  'ClassMethod',
  'ClassPrivateMethod',
  'TSDeclareMethod',
]);
