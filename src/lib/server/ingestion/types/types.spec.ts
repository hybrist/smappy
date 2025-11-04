/**
 * Tests for type definitions and test helpers
 */
import { describe, it, expect } from 'vitest';
import {
  createMockBundleInput,
  createMockChunkInput,
  createMockModuleInput,
  createMockIngestionOptions,
  createMockParsedSymbol,
  createMockParsedDependency,
  createMockSizeInfo,
  type BundleInput,
  type ChunkInput,
  type ModuleInput,
  type IngestionOptions,
  type ParsedSymbol,
  type ParsedDependency,
  type SizeInfo,
} from './index.js';

describe('Type definitions', () => {
  describe('BundleInput', () => {
    it('should create a valid BundleInput with defaults', () => {
      const bundle = createMockBundleInput();
      expect(bundle.fileName).toBe('bundle.js');
      expect(bundle.content).toBe('console.log("Hello, world!");');
      expect(bundle.type).toBe('js');
      expect(bundle.sourceMapReference).toBeUndefined();
    });

    it('should create a BundleInput with overrides', () => {
      const bundle = createMockBundleInput({
        fileName: 'custom.mjs',
        type: 'mjs',
        sourceMapReference: 'sourcemap-content',
      });
      expect(bundle.fileName).toBe('custom.mjs');
      expect(bundle.type).toBe('mjs');
      expect(bundle.sourceMapReference).toBe('sourcemap-content');
    });

    it('should accept all valid bundle types', () => {
      const types: BundleInput['type'][] = ['js', 'mjs', 'cjs', 'jsx', 'tsx', 'ts'];
      types.forEach((type) => {
        const bundle = createMockBundleInput({ type });
        expect(bundle.type).toBe(type);
      });
    });
  });

  describe('ChunkInput', () => {
    it('should create a valid ChunkInput with defaults', () => {
      const chunk = createMockChunkInput();
      expect(chunk.name).toBe('main');
      expect(chunk.isEntry).toBe(true);
      expect(chunk.isAsync).toBe(false);
      expect(chunk.moduleIds).toEqual(['./src/index.js']);
    });

    it('should create a ChunkInput with overrides', () => {
      const chunk = createMockChunkInput({
        name: 'vendor',
        isEntry: false,
        isAsync: true,
        moduleIds: ['./src/utils.js', './src/helpers.js'],
      });
      expect(chunk.name).toBe('vendor');
      expect(chunk.isEntry).toBe(false);
      expect(chunk.isAsync).toBe(true);
      expect(chunk.moduleIds).toHaveLength(2);
    });
  });

  describe('ModuleInput', () => {
    it('should create a valid ModuleInput with defaults', () => {
      const module = createMockModuleInput();
      expect(module.filePath).toBe('./src/index.js');
      expect(module.sourceContent).toBe('export default function() {}');
      expect(module.fileType).toBe('js');
    });

    it('should create a ModuleInput with overrides', () => {
      const module = createMockModuleInput({
        filePath: './src/component.tsx',
        sourceContent: 'export const Component = () => <div />;',
        fileType: 'tsx',
      });
      expect(module.filePath).toBe('./src/component.tsx');
      expect(module.fileType).toBe('tsx');
    });

    it('should accept all valid file types', () => {
      const types: ModuleInput['fileType'][] = [
        'js',
        'mjs',
        'cjs',
        'jsx',
        'ts',
        'tsx',
        'json',
        'css',
      ];
      types.forEach((fileType) => {
        const module = createMockModuleInput({ fileType });
        expect(module.fileType).toBe(fileType);
      });
    });
  });

  describe('IngestionOptions', () => {
    it('should create valid IngestionOptions with defaults', () => {
      const options = createMockIngestionOptions();
      expect(options.bundlerType).toBe('webpack');
      expect(options.projectName).toBe('test-project');
      expect(options.enableIncremental).toBe(false);
      expect(options.compareWithPrevious).toBe(false);
      expect(options.maxHistorySize).toBe(10);
    });

    it('should create IngestionOptions with overrides', () => {
      const options = createMockIngestionOptions({
        bundlerType: 'vite',
        projectName: 'my-app',
        enableIncremental: true,
        compareWithPrevious: true,
        maxHistorySize: 5,
      });
      expect(options.bundlerType).toBe('vite');
      expect(options.projectName).toBe('my-app');
      expect(options.enableIncremental).toBe(true);
      expect(options.compareWithPrevious).toBe(true);
      expect(options.maxHistorySize).toBe(5);
    });

    it('should accept all valid bundler types', () => {
      const types: IngestionOptions['bundlerType'][] = [
        'webpack',
        'rollup',
        'esbuild',
        'vite',
        'parcel',
        'other',
      ];
      types.forEach((bundlerType) => {
        const options = createMockIngestionOptions({ bundlerType });
        expect(options.bundlerType).toBe(bundlerType);
      });
    });
  });

  describe('ParsedSymbol', () => {
    it('should create a valid ParsedSymbol with defaults', () => {
      const symbol = createMockParsedSymbol();
      expect(symbol.name).toBe('testFunction');
      expect(symbol.type).toBe('function');
      expect(symbol.location.start.line).toBe(1);
      expect(symbol.location.start.column).toBe(0);
      expect(symbol.location.end.line).toBe(1);
      expect(symbol.location.end.column).toBe(10);
      expect(symbol.size).toBe(100);
      expect(symbol.scope).toBe('module');
    });

    it('should create a ParsedSymbol with overrides', () => {
      const symbol = createMockParsedSymbol({
        name: 'MyClass',
        type: 'class',
        size: 500,
        scope: 'global',
      });
      expect(symbol.name).toBe('MyClass');
      expect(symbol.type).toBe('class');
      expect(symbol.size).toBe(500);
      expect(symbol.scope).toBe('global');
    });

    it('should accept all valid symbol types', () => {
      const types: ParsedSymbol['type'][] = [
        'function',
        'class',
        'variable',
        'import',
        'export',
        'const',
        'let',
      ];
      types.forEach((type) => {
        const symbol = createMockParsedSymbol({ type });
        expect(symbol.type).toBe(type);
      });
    });

    it('should accept all valid scope types', () => {
      const scopes: ParsedSymbol['scope'][] = ['global', 'module', 'function', 'block'];
      scopes.forEach((scope) => {
        const symbol = createMockParsedSymbol({ scope });
        expect(symbol.scope).toBe(scope);
      });
    });
  });

  describe('ParsedDependency', () => {
    it('should create a valid ParsedDependency with defaults', () => {
      const dep = createMockParsedDependency();
      expect(dep.source).toBe('./src/index.js');
      expect(dep.target).toBe('./src/utils.js');
      expect(dep.type).toBe('import');
      expect(dep.importedNames).toEqual(['helper']);
      expect(dep.isDefault).toBe(false);
      expect(dep.isNamespace).toBe(false);
    });

    it('should create a ParsedDependency with overrides', () => {
      const dep = createMockParsedDependency({
        source: './src/app.js',
        target: 'lodash',
        type: 'dynamic-import',
        importedNames: undefined,
        isDefault: true,
      });
      expect(dep.source).toBe('./src/app.js');
      expect(dep.target).toBe('lodash');
      expect(dep.type).toBe('dynamic-import');
      expect(dep.importedNames).toBeUndefined();
      expect(dep.isDefault).toBe(true);
    });

    it('should accept all valid dependency types', () => {
      const types: ParsedDependency['type'][] = ['import', 'export', 're-export', 'dynamic-import'];
      types.forEach((type) => {
        const dep = createMockParsedDependency({ type });
        expect(dep.type).toBe(type);
      });
    });

    it('should support location information', () => {
      const dep = createMockParsedDependency({
        location: {
          start: { line: 5, column: 0 },
          end: { line: 5, column: 30 },
        },
      });
      expect(dep.location).toBeDefined();
      expect(dep.location?.start.line).toBe(5);
      expect(dep.location?.end.column).toBe(30);
    });
  });

  describe('SizeInfo', () => {
    it('should create a valid SizeInfo with defaults', () => {
      const size = createMockSizeInfo();
      expect(size.raw).toBe(1000);
      expect(size.gzipped).toBe(500);
      expect(size.attributed).toBeUndefined();
      expect(size.brotli).toBe(450);
    });

    it('should create a SizeInfo with overrides', () => {
      const attributed = new Map([
        ['module1', 300],
        ['module2', 200],
      ]);
      const size = createMockSizeInfo({
        raw: 2000,
        gzipped: 800,
        attributed,
        brotli: 700,
      });
      expect(size.raw).toBe(2000);
      expect(size.gzipped).toBe(800);
      expect(size.attributed).toBe(attributed);
      expect(size.brotli).toBe(700);
    });

    it('should support attributed sizes as a Map', () => {
      const attributed = new Map([
        ['./src/index.js', 500],
        ['./src/utils.js', 300],
        ['./src/helpers.js', 200],
      ]);
      const size = createMockSizeInfo({ attributed });
      expect(size.attributed?.size).toBe(3);
      expect(size.attributed?.get('./src/index.js')).toBe(500);
    });
  });
});

describe('Type exports', () => {
  it('should export all required types', () => {
    // This test ensures all types are properly exported
    const bundle: BundleInput = createMockBundleInput();
    const chunk: ChunkInput = createMockChunkInput();
    const module: ModuleInput = createMockModuleInput();
    const options: IngestionOptions = createMockIngestionOptions();
    const symbol: ParsedSymbol = createMockParsedSymbol();
    const dep: ParsedDependency = createMockParsedDependency();
    const size: SizeInfo = createMockSizeInfo();

    expect(bundle).toBeDefined();
    expect(chunk).toBeDefined();
    expect(module).toBeDefined();
    expect(options).toBeDefined();
    expect(symbol).toBeDefined();
    expect(dep).toBeDefined();
    expect(size).toBeDefined();
  });
});

describe('Validation tests', () => {
  it('should ensure BundleInput has required fields', () => {
    const bundle = createMockBundleInput();
    expect(bundle).toHaveProperty('fileName');
    expect(bundle).toHaveProperty('content');
    expect(bundle).toHaveProperty('type');
  });

  it('should ensure ChunkInput has required fields', () => {
    const chunk = createMockChunkInput();
    expect(chunk).toHaveProperty('name');
    expect(chunk).toHaveProperty('isEntry');
    expect(chunk).toHaveProperty('isAsync');
    expect(chunk).toHaveProperty('moduleIds');
  });

  it('should ensure ModuleInput has required fields', () => {
    const module = createMockModuleInput();
    expect(module).toHaveProperty('filePath');
    expect(module).toHaveProperty('sourceContent');
    expect(module).toHaveProperty('fileType');
  });

  it('should ensure IngestionOptions has required fields', () => {
    const options = createMockIngestionOptions();
    expect(options).toHaveProperty('bundlerType');
    expect(options).toHaveProperty('projectName');
  });

  it('should ensure ParsedSymbol has required fields', () => {
    const symbol = createMockParsedSymbol();
    expect(symbol).toHaveProperty('name');
    expect(symbol).toHaveProperty('type');
    expect(symbol).toHaveProperty('location');
    expect(symbol).toHaveProperty('size');
  });

  it('should ensure ParsedDependency has required fields', () => {
    const dep = createMockParsedDependency();
    expect(dep).toHaveProperty('source');
    expect(dep).toHaveProperty('target');
    expect(dep).toHaveProperty('type');
  });

  it('should ensure SizeInfo has required fields', () => {
    const size = createMockSizeInfo();
    expect(size).toHaveProperty('raw');
    expect(size).toHaveProperty('gzipped');
  });
});
