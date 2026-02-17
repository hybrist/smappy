import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Create a temporary directory for config files
 */
export async function createTempDir(prefix = 'smappy'): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}
