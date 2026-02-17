import { parse } from '@babel/parser';
import type { Node } from '@babel/types';

export type SyntaxCategoryId =
  | 'class'
  | 'function'
  | 'method'
  | 'string_literal'
  | 'template_literal'
  | 'import_export'
  | 'object_literal'
  | 'comment'
  | 'other';

export interface SyntaxCategorySummary {
  id: SyntaxCategoryId;
  label: string;
  bytes: number;
  characters: number;
  occurrences: number;
}

export interface ScriptSyntaxAnalysis {
  bytes: number;
  characters: number;
  categories: SyntaxCategorySummary[];
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
  method: { label: 'Methods', priority: 8 },
  function: { label: 'Functions', priority: 7 },
  class: { label: 'Classes', priority: 6 },
  import_export: { label: 'Imports/exports', priority: 5 },
  object_literal: { label: 'Object literals', priority: 4 },
  comment: { label: 'Comments', priority: 1 },
};

const CATEGORY_ORDER = Object.entries(CATEGORY_INFO)
  .sort((a, b) => b[1].priority - a[1].priority)
  .map(([id]) => id as Exclude<SyntaxCategoryId, 'other'>);

export function analyzeSyntax(source: string): ScriptSyntaxAnalysis {
  const ast = parseSource(source);
  const groupedIntervals: Record<
    Exclude<SyntaxCategoryId, 'other'>,
    Segment[]
  > = {
    class: [],
    function: [],
    method: [],
    string_literal: [],
    template_literal: [],
    import_export: [],
    object_literal: [],
    comment: [],
  };
  const occurrences: Record<Exclude<SyntaxCategoryId, 'other'>, number> = {
    class: 0,
    function: 0,
    method: 0,
    string_literal: 0,
    template_literal: 0,
    import_export: 0,
    object_literal: 0,
    comment: 0,
  };

  visitNode(ast.program as Node, (node) => {
    if (!hasRange(node)) {
      return;
    }

    switch (node.type) {
      case 'ClassDeclaration':
      case 'ClassExpression':
        addInterval(
          groupedIntervals.class,
          node.start,
          node.end,
          occurrences,
          'class',
        );
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        addInterval(
          groupedIntervals.function,
          node.start,
          node.end,
          occurrences,
          'function',
        );
        break;
      case 'ClassMethod':
      case 'ClassPrivateMethod':
      case 'ObjectMethod':
      case 'TSDeclareMethod':
        addInterval(
          groupedIntervals.method,
          node.start,
          node.end,
          occurrences,
          'method',
        );
        break;
      case 'StringLiteral':
        addInterval(
          groupedIntervals.string_literal,
          node.start,
          node.end,
          occurrences,
          'string_literal',
        );
        break;
      case 'TemplateLiteral':
        addInterval(
          groupedIntervals.template_literal,
          node.start,
          node.end,
          occurrences,
          'template_literal',
        );
        break;
      case 'ImportDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
      case 'ImportExpression':
        addInterval(
          groupedIntervals.import_export,
          node.start,
          node.end,
          occurrences,
          'import_export',
        );
        break;
      case 'ObjectExpression':
        addInterval(
          groupedIntervals.object_literal,
          node.start,
          node.end,
          occurrences,
          'object_literal',
        );
        break;
      default:
        break;
    }
  });

  if (Array.isArray((ast as any).comments)) {
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
      }
    }
  }

  const occupied: Segment[] = [];
  const attributed: Record<Exclude<SyntaxCategoryId, 'other'>, Segment[]> = {
    class: [],
    function: [],
    method: [],
    string_literal: [],
    template_literal: [],
    import_export: [],
    object_literal: [],
    comment: [],
  };

  for (const category of CATEGORY_ORDER) {
    const merged = mergeSegments(groupedIntervals[category]);
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

  for (const category of CATEGORY_ORDER) {
    const segments = mergeSegments(attributed[category]);
    if (!segments.length) {
      continue;
    }

    const bytes = sumBytes(source, segments);
    const chars = sumCharacters(segments);
    accountedBytes += bytes;
    accountedChars += chars;

    summaries.push({
      id: category,
      label: CATEGORY_INFO[category].label,
      bytes,
      characters: chars,
      occurrences: occurrences[category],
    });
  }

  const remainingBytes = Math.max(0, totalBytes - accountedBytes);
  const remainingChars = Math.max(0, totalCharacters - accountedChars);

  summaries.push({
    id: 'other',
    label: 'Other',
    bytes: remainingBytes,
    characters: remainingChars,
    occurrences: 0,
  });

  return {
    bytes: totalBytes,
    characters: totalCharacters,
    categories: summaries,
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
  occurrences: Record<Exclude<SyntaxCategoryId, 'other'>, number>,
  category: Exclude<SyntaxCategoryId, 'other'>,
) {
  if (start >= end) {
    return;
  }
  list.push({ start, end });
  occurrences[category] += 1;
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
