import picomatch from 'picomatch';
import type { HarEntry, HarFile, HarWarning, ScriptResource } from './types.ts';

export interface ExtractionOptions {
  page?: string;
  include?: string;
}

export interface ExtractionResult {
  scripts: ScriptResource[];
  warnings: HarWarning[];
  scannedEntries: number;
  matchedEntries: number;
}

const JS_MIME_PATTERN = /javascript|ecmascript|module/i;
const JS_EXTENSION_PATTERN = /\.([cm]?js|jsx|ts|tsx)(\?|$)/i;

export function extractJavaScript(
  har: HarFile,
  options: ExtractionOptions = {},
): ExtractionResult {
  const matcher = options.include
    ? picomatch(options.include, { nocase: true, contains: true, dot: true })
    : null;
  const warnings: HarWarning[] = [];
  const scripts: ScriptResource[] = [];
  const pageMatcher = buildPageMatcher(har, options.page);

  let matchedEntries = 0;

  for (const entry of har.log.entries) {
    if (pageMatcher && !pageMatcher(entry.pageref)) {
      continue;
    }

    if (!isJavaScriptEntry(entry)) {
      continue;
    }

    const url = entry.request?.url ?? 'unknown';
    if (matcher && !matcher(url)) {
      continue;
    }

    matchedEntries += 1;

    const content = entry.response?.content;
    if (!content || typeof content.text !== 'string' || !content.text.length) {
      warnings.push({
        type: 'missing-content',
        message: 'Response did not include body text',
        url,
      });
      continue;
    }

    try {
      const body = decodeBody(content.text, content.encoding);
      scripts.push({
        url,
        mimeType: content.mimeType,
        body,
        bytes: Buffer.byteLength(body, 'utf8'),
        pageRef: entry.pageref,
      });
    } catch (error) {
      warnings.push({
        type: 'parse-error',
        message: 'Could not decode response body',
        url,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    scripts,
    warnings,
    scannedEntries: har.log.entries.length,
    matchedEntries,
  };
}

function buildPageMatcher(
  har: HarFile,
  page?: string,
): ((pageRef?: string) => boolean) | null {
  if (!page) {
    return null;
  }

  const trimmed = page.trim();
  if (!trimmed.length) {
    return null;
  }

  const pageIds = new Set<string>();
  if (har.log.pages) {
    for (const candidate of har.log.pages) {
      if (candidate.id === trimmed || candidate.title === trimmed) {
        pageIds.add(candidate.id);
      }
    }
  }

  if (!pageIds.size) {
    // Fall back to raw value to allow direct pageref matching even if not declared in pages.
    pageIds.add(trimmed);
  }

  return (pageRef?: string) => (pageRef ? pageIds.has(pageRef) : false);
}

function isJavaScriptEntry(entry: HarEntry): boolean {
  const mime = entry.response?.content?.mimeType;
  if (mime && JS_MIME_PATTERN.test(mime)) {
    return true;
  }

  const url = entry.request?.url;
  if (url && JS_EXTENSION_PATTERN.test(url)) {
    return true;
  }

  return false;
}

function decodeBody(text: string, encoding?: string): string {
  if (encoding?.toLowerCase() === 'base64') {
    return Buffer.from(text, 'base64').toString('utf8');
  }

  return text;
}
