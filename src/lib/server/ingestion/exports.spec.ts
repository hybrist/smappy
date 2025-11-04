/**
 * Integration test to verify all types are properly exported from the main index
 */
import { describe, it, expect } from 'vitest';
import {
  // Type imports
  type BundleInput,
  type ChunkInput,
  type ModuleInput,
  type IngestionOptions,
  type ParsedSymbol,
  type ParsedDependency,
  type SizeInfo,
  // Test helper imports
  createMockBundleInput,
  createMockChunkInput,
  createMockModuleInput,
  createMockIngestionOptions,
  createMockParsedSymbol,
  createMockParsedDependency,
  createMockSizeInfo,
} from './index.js';

describe('Type exports from main index', () => {
  it('should export all input types', () => {
    const bundle: BundleInput = createMockBundleInput();
    const chunk: ChunkInput = createMockChunkInput();
    const module: ModuleInput = createMockModuleInput();
    const options: IngestionOptions = createMockIngestionOptions();

    expect(bundle).toBeDefined();
    expect(chunk).toBeDefined();
    expect(module).toBeDefined();
    expect(options).toBeDefined();
  });

  it('should export all internal types', () => {
    const symbol: ParsedSymbol = createMockParsedSymbol();
    const dep: ParsedDependency = createMockParsedDependency();
    const size: SizeInfo = createMockSizeInfo();

    expect(symbol).toBeDefined();
    expect(dep).toBeDefined();
    expect(size).toBeDefined();
  });

  it('should export all test helpers', () => {
    expect(createMockBundleInput).toBeDefined();
    expect(typeof createMockBundleInput).toBe('function');
    expect(createMockChunkInput).toBeDefined();
    expect(typeof createMockChunkInput).toBe('function');
    expect(createMockModuleInput).toBeDefined();
    expect(typeof createMockModuleInput).toBe('function');
    expect(createMockIngestionOptions).toBeDefined();
    expect(typeof createMockIngestionOptions).toBe('function');
    expect(createMockParsedSymbol).toBeDefined();
    expect(typeof createMockParsedSymbol).toBe('function');
    expect(createMockParsedDependency).toBeDefined();
    expect(typeof createMockParsedDependency).toBe('function');
    expect(createMockSizeInfo).toBeDefined();
    expect(typeof createMockSizeInfo).toBe('function');
  });
});
