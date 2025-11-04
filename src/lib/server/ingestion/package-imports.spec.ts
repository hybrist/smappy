/**
 * Test to verify all installed packages can be imported correctly
 */
import { describe, it, expect } from 'vitest';

describe('Package imports', () => {
  it('should import @jridgewell/source-map', async () => {
    const sourceMap = await import('@jridgewell/source-map');
    expect(sourceMap).toBeDefined();
    expect(sourceMap.SourceMapConsumer).toBeDefined();
  });

  it('should import @babel/parser', async () => {
    const parser = await import('@babel/parser');
    expect(parser).toBeDefined();
    expect(parser.parse).toBeDefined();
  });

  it('should import @babel/traverse', async () => {
    const traverse = await import('@babel/traverse');
    expect(traverse).toBeDefined();
    expect(traverse.default).toBeDefined();
  });

  it('should import pako', async () => {
    const pako = await import('pako');
    expect(pako).toBeDefined();
    expect(pako.gzip).toBeDefined();
  });
});
