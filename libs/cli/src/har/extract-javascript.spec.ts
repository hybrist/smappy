import { readFile } from 'node:fs/promises';
import { describe, expect, it, beforeAll } from 'vitest';
import { extractJavaScript } from './extract-javascript.ts';
import type { HarFile } from './types.ts';

let fixture: HarFile;

beforeAll(async () => {
  const raw = await readFile(
    new URL('./__fixtures__/simple.har', import.meta.url),
    'utf8',
  );
  fixture = JSON.parse(raw) as HarFile;
});

describe('extractJavaScript', () => {
  it('returns decoded script bodies', () => {
    const result = extractJavaScript(fixture);
    expect(result.scripts).toHaveLength(2);
    expect(result.scripts[1].body.trim()).toContain('export function add');
  });

  it('supports page and glob filters', () => {
    const result = extractJavaScript(fixture, {
      page: 'Dashboard',
      include: '*utils*',
    });
    expect(result.scripts).toHaveLength(1);
    expect(result.scripts[0].url).toContain('utils');
  });
});
