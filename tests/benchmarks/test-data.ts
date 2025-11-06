/**
 * Test data generators for benchmarks
 */

import type {
  BundleInput,
  ModuleInput,
  ChunkInput,
} from '../../src/lib/server/ingestion/types/index.js';

/**
 * Generate a module with specified approximate size in bytes
 */
export function generateModule(sizeBytes: number, index: number): ModuleInput {
  // Average JavaScript characters per byte (roughly 1:1, but we'll add some padding)
  const targetChars = Math.floor(sizeBytes * 1.1);

  // Generate realistic JavaScript code
  const functions = Math.floor(targetChars / 200); // ~200 chars per function
  const codeLines: string[] = [];

  // Add exports
  codeLines.push(`// Module ${index}`);
  codeLines.push(`export const module${index}Version = '1.0.0';`);

  // Generate functions
  for (let i = 0; i < functions; i++) {
    codeLines.push(
      `
export function function${index}_${i}(a, b, c) {
  const result = a + b * c;
  const intermediate = result * 2;
  const final = intermediate / 3;
  return final + (a * b) + (b * c) + (c * a);
}

export const constant${index}_${i} = {
  value: ${i},
  name: 'constant${index}_${i}',
  metadata: {
    type: 'number',
    description: 'Test constant ${index}_${i}',
  },
};
    `.trim(),
    );
  }

  let code = codeLines.join('\n\n');
  // Pad if needed
  if (code.length < targetChars) {
    const padding = `\n// ${'x'.repeat(targetChars - code.length - 5)}\n`;
    code = code + padding;
  }

  return {
    filePath: `./src/module${index}.js`,
    sourceContent: code.slice(0, targetChars),
    fileType: 'js' as const,
  };
}

/**
 * Generate modules for a bundle of approximate total size
 */
export function generateModulesForBundle(
  totalSizeBytes: number,
  moduleCount: number,
): ModuleInput[] {
  const modules: ModuleInput[] = [];
  const sizePerModule = Math.floor(totalSizeBytes / moduleCount);

  for (let i = 0; i < moduleCount; i++) {
    modules.push(generateModule(sizePerModule, i));
  }

  return modules;
}

/**
 * Generate a bundle with specified approximate size
 */
export function generateBundle(sizeBytes: number, index: number): BundleInput {
  // Generate bundle content (bundled code is typically smaller than source)
  const targetChars = Math.floor(sizeBytes * 0.9);

  const codeLines: string[] = [];
  codeLines.push(`// Bundle ${index}`);

  // Generate bundled code
  const functions = Math.floor(targetChars / 150);
  for (let i = 0; i < functions; i++) {
    codeLines.push(`function b${index}_${i}(a,b,c){return a+b*c}`);
  }

  let code = codeLines.join('');
  if (code.length < targetChars) {
    code = code + 'x'.repeat(targetChars - code.length);
  }

  return {
    fileName: `bundle${index}.js`,
    content: code.slice(0, targetChars),
    type: 'js' as const,
  };
}

/**
 * Generate chunks for modules
 */
export function generateChunks(moduleCount: number, chunkCount: number = 1): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  const modulesPerChunk = Math.ceil(moduleCount / chunkCount);

  for (let i = 0; i < chunkCount; i++) {
    const startIdx = i * modulesPerChunk;
    const endIdx = Math.min(startIdx + modulesPerChunk, moduleCount);
    const moduleIds = Array.from(
      { length: endIdx - startIdx },
      (_, j) => `./src/module${startIdx + j}.js`,
    );

    chunks.push({
      name: `chunk${i}`,
      isEntry: i === 0,
      isAsync: i > 0,
      moduleIds,
    });
  }

  return chunks;
}

/**
 * Create test data for different bundle sizes
 */
export interface TestDataConfig {
  bundleSizeBytes: number;
  moduleCount: number;
  bundleCount: number;
  chunkCount: number;
}

export function createTestData(config: TestDataConfig): {
  bundles: BundleInput[];
  modules: ModuleInput[];
  chunks: ChunkInput[];
} {
  const { bundleSizeBytes, moduleCount, bundleCount, chunkCount } = config;

  // Generate modules (distributed across bundles)
  const modulesPerBundle = Math.ceil(moduleCount / bundleCount);
  const modules: ModuleInput[] = [];

  for (let i = 0; i < moduleCount; i++) {
    const moduleSize = Math.floor(bundleSizeBytes / modulesPerBundle);
    modules.push(generateModule(moduleSize, i));
  }

  // Generate bundles
  const bundles: BundleInput[] = [];
  for (let i = 0; i < bundleCount; i++) {
    bundles.push(generateBundle(bundleSizeBytes, i));
  }

  // Generate chunks
  const chunks = generateChunks(moduleCount, chunkCount);

  return { bundles, modules, chunks };
}

/**
 * Predefined test configurations for different sizes
 */
export const TEST_CONFIGS = {
  small: {
    bundleSizeBytes: 1 * 1024 * 1024, // 1MB
    moduleCount: 50,
    bundleCount: 1,
    chunkCount: 1,
  },
  medium: {
    bundleSizeBytes: 10 * 1024 * 1024, // 10MB
    moduleCount: 500,
    bundleCount: 3,
    chunkCount: 3,
  },
  large: {
    bundleSizeBytes: 50 * 1024 * 1024, // 50MB
    moduleCount: 2500,
    bundleCount: 10,
    chunkCount: 10,
  },
} as const;
