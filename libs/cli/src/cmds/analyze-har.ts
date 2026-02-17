import path from 'node:path';
import { analyzeScripts } from '../har/analyzer.ts';
import { extractJavaScript } from '../har/extract-javascript.ts';
import { loadHar } from '../har/loader.ts';
import { renderReport } from '../har/report.ts';

export interface AnalyzeHarOptions {
  page?: string;
  include?: string;
  json?: boolean;
  top?: string | number;
}

export async function analyzeHarCommand(
  harPath: string,
  options: AnalyzeHarOptions = {},
) {
  const resolvedPath = path.resolve(process.cwd(), harPath);
  try {
    const har = await loadHar(resolvedPath);
    const extraction = extractJavaScript(har, {
      page: options.page,
      include: options.include,
    });

    if (!extraction.scripts.length) {
      console.error('No JavaScript responses matched the provided filters.');
      return 1;
    }

    const analysis = analyzeScripts(extraction.scripts);
    const warnings = [...extraction.warnings, ...analysis.warnings];
    renderReport(analysis, {
      json: options.json,
      top: parseTop(options.top),
      warnings,
    });
    return 0;
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : `Failed to analyze HAR: ${String(error)}`,
    );
    return 1;
  }
}

function parseTop(value?: string | number) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
