import type { AnalyzerResult } from './analyzer.ts';
import type { HarWarning } from './types.ts';

export interface ReportOptions {
  json?: boolean;
  top?: number;
  warnings?: HarWarning[];
}

export function renderReport(
  result: AnalyzerResult,
  options: ReportOptions = {},
) {
  const warnings = options.warnings ?? [];
  const top = options.top ?? 0;

  if (options.json) {
    const payload = {
      totalBytes: result.totalBytes,
      totalScripts: result.totalScripts,
      categories: applyTopFilter(result, top),
      warnings,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(
    `Analyzed ${result.totalScripts} JavaScript responses (${formatBytes(result.totalBytes)})`,
  );
  console.log('');

  const categories = applyTopFilter(result, top);
  console.log(buildTable(categories));

  if (warnings.length) {
    console.log('');
    console.log('Warnings:');
    for (const warning of warnings) {
      const source = warning.url
        ? `${warning.message} (${warning.url})`
        : warning.message;
      if (warning.details) {
        console.log(`- ${source} – ${warning.details}`);
      } else {
        console.log(`- ${source}`);
      }
    }
  }
}

function applyTopFilter(result: AnalyzerResult, top: number) {
  if (!top || top <= 0) {
    return result.categories;
  }

  const main = result.categories.filter((category) => category.id !== 'other');
  const other = result.categories.find((category) => category.id === 'other');
  const trimmed = main.slice(0, top);
  if (other) {
    trimmed.push(other);
  }
  return trimmed;
}

function buildTable(categories: AnalyzerResult['categories']) {
  if (!categories.length) {
    return 'No categories to report.';
  }

  const headers = ['Category', 'Bytes', '% of total', 'Occurrences'];
  const rows = categories.map((category) => [
    category.label,
    formatBytes(category.bytes),
    formatPercent(category.percentage),
    category.occurrences.toString(),
  ]);

  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );

  const lines = [];
  lines.push(formatRow(headers, widths, [false, true, true, true]));
  lines.push(
    formatRow(
      widths.map((w) => '-'.repeat(w)),
      widths,
    ),
  );
  for (const row of rows) {
    lines.push(formatRow(row, widths, [false, true, true, true]));
  }
  return lines.join('\n');
}

function formatRow(
  cells: string[],
  widths: number[],
  numericColumns: boolean[] = [],
): string {
  return cells
    .map((cell, index) => pad(cell, widths[index], numericColumns[index]))
    .join('  ');
}

function pad(value: string, width: number, numeric?: boolean) {
  if (numeric) {
    return value.padStart(width, ' ');
  }
  return value.padEnd(width, ' ');
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let current = bytes;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}
