/**
 * Tests for plugin utilities
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  extractSourceMap,
  extractSourceMapFromPath,
  detectFileType,
  isModuleFile,
  isSourceFile,
  normalizePath,
  resolveModulePath,
  calculateSize,
  getSize,
  readFileContent,
  readFileContentSafe,
  shouldExcludeFile,
  shouldIncludeFile,
} from './utils.ts';

describe('Source Map Utilities', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `plugin-utils-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('extractSourceMap', () => {
    it('should extract inline base64 source map', () => {
      const sourceMap = { version: 3, sources: ['index.js'] };
      const base64 = Buffer.from(JSON.stringify(sourceMap)).toString('base64');
      const bundleContent = `console.log("test");\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64}`;

      const result = extractSourceMap(bundleContent, 'bundle.js');
      expect(result).toBeDefined();
      expect(JSON.parse(result!)).toEqual(sourceMap);
    });

    it('should extract external source map reference', () => {
      const sourceMap = { version: 3, sources: ['index.js'] };
      const sourceMapPath = join(testDir, 'bundle.js.map');
      writeFileSync(sourceMapPath, JSON.stringify(sourceMap));

      const bundlePath = join(testDir, 'bundle.js');
      const bundleContent = `console.log("test");\n//# sourceMappingURL=bundle.js.map`;
      writeFileSync(bundlePath, bundleContent);

      const result = extractSourceMap(bundleContent, bundlePath);
      expect(result).toBeDefined();
      expect(JSON.parse(result!)).toEqual(sourceMap);
    });

    it('should return undefined if no source map found', () => {
      const bundleContent = 'console.log("test");';
      const result = extractSourceMap(bundleContent, 'bundle.js');
      expect(result).toBeUndefined();
    });

    it('should handle invalid base64 gracefully', () => {
      const bundleContent =
        'console.log("test");\n//# sourceMappingURL=data:application/json;base64,invalid!!!';
      const result = extractSourceMap(bundleContent, 'bundle.js');
      expect(result).toBeUndefined();
    });
  });

  describe('extractSourceMapFromPath', () => {
    it('should read source map from .map file', () => {
      const sourceMap = { version: 3, sources: ['index.js'] };
      const bundlePath = join(testDir, 'bundle.js');
      const sourceMapPath = `${bundlePath}.map`;
      writeFileSync(sourceMapPath, JSON.stringify(sourceMap));

      const result = extractSourceMapFromPath(bundlePath);
      expect(result).toBeDefined();
      expect(JSON.parse(result!)).toEqual(sourceMap);
    });

    it('should return undefined if .map file does not exist', () => {
      const bundlePath = join(testDir, 'bundle.js');
      const result = extractSourceMapFromPath(bundlePath);
      expect(result).toBeUndefined();
    });
  });
});

describe('File Type Detection', () => {
  describe('detectFileType', () => {
    it('should detect JavaScript files', () => {
      expect(detectFileType('index.js')).toBe('js');
      expect(detectFileType('./src/index.js')).toBe('js');
    });

    it('should detect ES modules', () => {
      expect(detectFileType('index.mjs')).toBe('mjs');
    });

    it('should detect CommonJS files', () => {
      expect(detectFileType('index.cjs')).toBe('cjs');
    });

    it('should detect JSX files', () => {
      expect(detectFileType('Component.jsx')).toBe('jsx');
    });

    it('should detect TypeScript files', () => {
      expect(detectFileType('index.ts')).toBe('ts');
      expect(detectFileType('Component.tsx')).toBe('tsx');
    });

    it('should detect JSON files', () => {
      expect(detectFileType('config.json')).toBe('json');
    });

    it('should detect CSS files', () => {
      expect(detectFileType('styles.css')).toBe('css');
    });

    it('should default to js for unknown extensions', () => {
      expect(detectFileType('file.unknown')).toBe('js');
    });
  });

  describe('isModuleFile', () => {
    it('should return true for JavaScript/TypeScript files', () => {
      expect(isModuleFile('index.js')).toBe(true);
      expect(isModuleFile('index.mjs')).toBe(true);
      expect(isModuleFile('index.cjs')).toBe(true);
      expect(isModuleFile('Component.jsx')).toBe(true);
      expect(isModuleFile('index.ts')).toBe(true);
      expect(isModuleFile('Component.tsx')).toBe(true);
    });

    it('should return false for non-module files', () => {
      expect(isModuleFile('styles.css')).toBe(false);
      expect(isModuleFile('config.json')).toBe(false);
      expect(isModuleFile('README.md')).toBe(false);
    });
  });

  describe('isSourceFile', () => {
    it('should return true for source files', () => {
      expect(isSourceFile('./src/index.js')).toBe(true);
      expect(isSourceFile('./src/components/Button.tsx')).toBe(true);
    });

    it('should return false for node_modules', () => {
      expect(isSourceFile('./node_modules/lodash/index.js')).toBe(false);
    });

    it('should return false for dist directories', () => {
      expect(isSourceFile('./dist/bundle.js')).toBe(false);
    });

    it('should return false for build directories', () => {
      expect(isSourceFile('./build/app.js')).toBe(false);
    });

    it('should return false for .next directories', () => {
      expect(isSourceFile('./.next/server.js')).toBe(false);
    });

    it('should return false for minified files', () => {
      expect(isSourceFile('./bundle.min.js')).toBe(false);
    });
  });
});

describe('Path Utilities', () => {
  describe('normalizePath', () => {
    it('should normalize Windows paths', () => {
      expect(normalizePath('src\\index.js')).toBe('src/index.js');
    });

    it('should preserve absolute Unix paths', () => {
      expect(normalizePath('/src/index.js')).toBe('/src/index.js');
      expect(normalizePath('///src/index.js')).toBe('/src/index.js');
    });

    it('should resolve relative paths with absolute baseDir', () => {
      expect(normalizePath('./src/index.js', '/project')).toBe(
        '/project/src/index.js',
      );
      expect(normalizePath('../other/index.js', '/project/src')).toBe(
        '/project/other/index.js',
      );
    });

    it('should remove redundant path segments', () => {
      expect(normalizePath('src/./index.js')).toBe('src/index.js');
      expect(normalizePath('src/../other/index.js')).toBe('other/index.js');
    });

    it('should handle absolute paths', () => {
      expect(normalizePath('C:\\project\\src\\index.js')).toBe(
        'C:/project/src/index.js',
      );
    });
  });

  describe('resolveModulePath', () => {
    it('should resolve absolute paths', () => {
      const result = resolveModulePath(
        '/src/utils.js',
        './src/index.js',
        '/project',
      );
      expect(result).toBe('src/utils.js');
    });

    it('should resolve node_modules imports', () => {
      const result = resolveModulePath('lodash', './src/index.js', '/project');
      expect(result).toBe('node_modules/lodash');
    });

    it('should resolve relative imports', () => {
      const result = resolveModulePath(
        './utils.js',
        './src/index.js',
        '/project',
      );
      expect(result).toBe('/project/src/utils.js');
    });

    it('should resolve parent directory imports', () => {
      const result = resolveModulePath(
        '../utils.js',
        './src/components/Button.js',
        '/project',
      );
      expect(result).toBe('/project/src/utils.js');
    });
  });
});

describe('Size Calculation Utilities', () => {
  describe('calculateSize', () => {
    it('should calculate size of string', () => {
      expect(calculateSize('hello')).toBe(5);
      expect(calculateSize('hello world')).toBe(11);
    });

    it('should calculate size of Buffer', () => {
      const buffer = Buffer.from('hello', 'utf-8');
      expect(calculateSize(buffer)).toBe(5);
    });

    it('should handle empty strings', () => {
      expect(calculateSize('')).toBe(0);
    });

    it('should handle unicode characters correctly', () => {
      expect(calculateSize('🚀')).toBe(4); // UTF-8 encoding
    });
  });

  describe('getSize', () => {
    it('should return size if provided', () => {
      expect(getSize(1024)).toBe(1024);
    });

    it('should calculate from content if size is undefined', () => {
      expect(getSize(undefined, 'hello')).toBe(5);
    });

    it('should return 0 if both are undefined', () => {
      expect(getSize(undefined)).toBe(0);
    });

    it('should prefer explicit size over content', () => {
      expect(getSize(1024, 'hello')).toBe(1024);
    });
  });
});

describe('File Reading Utilities', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `plugin-utils-read-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('readFileContent', () => {
    it('should read file content', () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'test content';
      writeFileSync(filePath, content);

      const result = readFileContent(filePath);
      expect(result).toBe(content);
    });

    it('should return undefined for non-existent files', () => {
      const result = readFileContent(join(testDir, 'nonexistent.txt'));
      expect(result).toBeUndefined();
    });
  });

  describe('readFileContentSafe', () => {
    it('should read file content and not add errors for existing files', () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'test content';
      writeFileSync(filePath, content);
      const errors: string[] = [];

      const result = readFileContentSafe(filePath, errors);
      expect(result).toBe(content);
      expect(errors).toHaveLength(0);
    });

    it('should add error for non-existent files', () => {
      const filePath = join(testDir, 'nonexistent.txt');
      const errors: string[] = [];

      const result = readFileContentSafe(filePath, errors);
      expect(result).toBeUndefined();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('nonexistent.txt');
    });
  });
});

describe('Filtering Utilities', () => {
  describe('shouldExcludeFile', () => {
    it('should return false if no patterns provided', () => {
      expect(shouldExcludeFile('./src/index.js')).toBe(false);
    });

    it('should exclude files matching regex patterns', () => {
      expect(shouldExcludeFile('./src/index.js', ['\\.spec\\.'])).toBe(false);
      expect(shouldExcludeFile('./src/index.spec.js', ['\\.spec\\.'])).toBe(
        true,
      );
    });

    it('should exclude files matching glob patterns', () => {
      expect(shouldExcludeFile('./src/index.js', ['**/node_modules/**'])).toBe(
        false,
      );
      expect(
        shouldExcludeFile('./node_modules/lodash/index.js', [
          '**/node_modules/**',
        ]),
      ).toBe(true);
    });

    it('should handle multiple patterns', () => {
      const patterns = ['**/node_modules/**', '**/*.spec.*'];
      expect(shouldExcludeFile('./src/index.js', patterns)).toBe(false);
      expect(
        shouldExcludeFile('./node_modules/lodash/index.js', patterns),
      ).toBe(true);
      expect(shouldExcludeFile('./src/index.spec.js', patterns)).toBe(true);
    });
  });

  describe('shouldIncludeFile', () => {
    it('should return true if no patterns provided', () => {
      expect(shouldIncludeFile('./src/index.js')).toBe(true);
    });

    it('should include files matching regex patterns', () => {
      expect(shouldIncludeFile('./src/index.ts', ['\\.ts$'])).toBe(true);
      expect(shouldIncludeFile('./src/index.js', ['\\.ts$'])).toBe(false);
    });

    it('should include files matching glob patterns', () => {
      expect(shouldIncludeFile('./src/index.ts', ['**/*.ts', '**/*.tsx'])).toBe(
        true,
      );
      expect(
        shouldIncludeFile('./src/Component.tsx', ['**/*.ts', '**/*.tsx']),
      ).toBe(true);
      expect(shouldIncludeFile('./src/index.js', ['**/*.ts', '**/*.tsx'])).toBe(
        false,
      );
    });

    it('should handle multiple patterns', () => {
      const patterns = ['**/*.ts', '**/*.tsx'];
      expect(shouldIncludeFile('./src/index.ts', patterns)).toBe(true);
      expect(shouldIncludeFile('./src/Component.tsx', patterns)).toBe(true);
      expect(shouldIncludeFile('./src/index.js', patterns)).toBe(false);
    });
  });
});
