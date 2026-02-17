import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { HarFile } from './types.ts';

export class HarLoaderError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'HarLoaderError';
    this.cause = cause;
  }
}

export async function loadHar(rawPath: string): Promise<HarFile> {
  const resolvedPath = path.resolve(rawPath);
  let fileContents: string;
  try {
    fileContents = await readFile(resolvedPath, 'utf8');
  } catch (error) {
    throw new HarLoaderError(
      `Unable to read HAR file at ${resolvedPath}`,
      error,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw new HarLoaderError('HAR file is not valid JSON', error);
  }

  if (!parsed || typeof parsed !== 'object' || !('log' in parsed)) {
    throw new HarLoaderError('HAR file is missing the "log" property');
  }

  const file = parsed as HarFile;
  if (!file.log || !Array.isArray(file.log.entries)) {
    throw new HarLoaderError('HAR file has no entries in log.entries');
  }

  return file;
}
