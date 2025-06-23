import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SourceAnalysisService } from './source-analysis.service';
import { BundleService } from './bundle.service';
import {
  GenMapping,
  addMapping,
  setSourceContent,
  toEncodedMap,
} from '@jridgewell/gen-mapping';
import { BundleConfig, SourceMapData } from '../models/bundle.models';
import { map } from 'rxjs';

describe('SourceAnalysisService', () => {
  let service: SourceAnalysisService;
  let bundleService: BundleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(SourceAnalysisService);
    bundleService = TestBed.inject(BundleService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('analyzeSourceFile', () => {
    beforeEach(async () => {
      const sourceContent = `export class MyClass {
  constructor() {}
  
  public method1(): void {
    console.log('test');
  }
  
  private method2(): string {
    return 'test';
  }
}

export function myFunction(param: string): number {
  return param.length;
}

export const myVariable = 'hello world';

const AliasClass = class OriginalClass {};

const aliasFunction = function originalFunction() {};

interface MyInterface {
  prop: string;
}`;

      const mapGen = new GenMapping();
      addMapping(mapGen, {
        source: 'src/test.ts',
        original: { line: 5, column: 4 },
        generated: { line: 1, column: 0 },
      });
      addMapping(mapGen, {
        source: 'src/test.ts',
        original: { line: 14, column: 9 },
        generated: { line: 1, column: 20 },
      });
      setSourceContent(mapGen, 'src/test.ts', sourceContent);

      const mockSourceMap: SourceMapData = toEncodedMap(mapGen);

      const encodedSourceMap = btoa(JSON.stringify(mockSourceMap));
      const mockChunkContent = `${'a'.repeat(100)}
//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;

      const mockChunk = new File([mockChunkContent], 'test.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      await bundleService.loadBundle(config);
    });

    it('should return null for non-existent file', () => {
      const result = service.analyzeSourceFile('non/existent/file.ts');
      expect(result).toBeNull();
    });

    it('should analyze TypeScript file and extract fragments', () => {
      const result = service.analyzeSourceFile('src/test.ts');

      expect(result).toBeTruthy();
      expect(result!.filePath).toBe('src/test.ts');

      expect(
        result!.fragments.map((f) => `${f.type}:${f.name}`).sort(),
      ).toEqual(
        [
          'class:MyClass',
          'class:OriginalClass',
          'method:MyClass.constructor',
          'method:MyClass.method1',
          'method:MyClass.method2',
          'function:myFunction',
          'function:originalFunction',
          'unknown:[ExportNamedDeclaration]',
          'unknown:[TSInterfaceDeclaration]',
        ].sort(),
      );
    });

    it('should mark fragments as included/excluded from bundle', () => {
      const result = service.analyzeSourceFile('src/test.ts');

      expect(result).toBeTruthy();
      expect(result!.includedFragments).toBeGreaterThanOrEqual(0);
      expect(result!.includedFragments).toBeLessThanOrEqual(
        result!.totalFragments,
      );

      // Check that bundle sizes are calculated for included fragments
      const includedFragment = result!.fragments.find(
        (f) => f.isIncludedInBundle,
      );
      if (includedFragment) {
        expect(includedFragment.bundleSize).toBeGreaterThan(0);
      }
    });

    it('should accurately attribute bundle bytes to specific fragments', () => {
      const result = service.analyzeSourceFile('src/test.ts');

      expect(result).toBeTruthy();

      const bundleSizes = Object.fromEntries(
        result!.fragments.map((f) => [f.name, f.bundleSize || 0]),
      );

      expect(bundleSizes).toEqual({
        MyClass: 20,
        'MyClass.constructor': 0,
        'MyClass.method1': 20,
        'MyClass.method2': 0,
        myFunction: 80,
        originalFunction: 0,
        OriginalClass: 0,
        '[ExportNamedDeclaration]': 0,
        '[TSInterfaceDeclaration]': 0,
      });
      expect(result!.includedFragments).toBe(3);
      expect(result!.fragments.length).toBe(9);
      expect(result!.unusedFragments.length).toBe(6);
    });

    it('should categorize fragments correctly', () => {
      const result = service.analyzeSourceFile('src/test.ts');

      expect(result).toBeTruthy();

      // All fragments should be accounted for
      const categorizedCount =
        result!.imports.length +
        result!.exports.length +
        result!.classes.length +
        result!.functions.length +
        result!.variables.length +
        result!.types.length;

      expect(categorizedCount).toBeLessThanOrEqual(result!.totalFragments);
    });
  });

  describe('getUnusedFragments', () => {
    it('should return fragments not included in bundle', async () => {
      const sourceContent = `export function used() { return 'used'; }
function unused() { return 'unused'; }`;

      const mockSourceMap: SourceMapData = {
        version: 3,
        sources: ['src/test.ts'],
        sourcesContent: [sourceContent],
        names: [],
        mappings: 'AAAA',
      };

      const encodedSourceMap = btoa(JSON.stringify(mockSourceMap));
      const mockChunkContent = `//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;

      const mockChunk = new File([mockChunkContent], 'test.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      await bundleService.loadBundle(config);

      const result = service.analyzeSourceFile('src/test.ts');
      expect(result).toBeTruthy();

      const unusedFragments = service.getUnusedFragments(result!);

      // Should only return fragments that are not included in bundle
      // and are not imports/exports
      unusedFragments.forEach((fragment) => {
        expect(fragment.isIncludedInBundle).toBe(false);
        expect(fragment.type).not.toBe('import');
        expect(fragment.type).not.toBe('export');
      });
    });
  });

  describe('CSS file analysis', () => {
    it('should parse CSS selectors', async () => {
      const cssContent = `.my-class {
  color: red;
  font-size: 16px;
}

#my-id {
  background: blue;
}`;

      const mockSourceMap: SourceMapData = {
        version: 3,
        sources: ['src/styles.css'],
        sourcesContent: [cssContent],
        names: [],
        mappings: 'AAAA',
      };

      const encodedSourceMap = btoa(JSON.stringify(mockSourceMap));
      const mockChunkContent = `//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;

      const mockChunk = new File([mockChunkContent], 'styles.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      await bundleService.loadBundle(config);

      const result = service.analyzeSourceFile('src/styles.css');
      expect(result).toBeTruthy();
      expect(result!.fragments.length).toBeGreaterThan(0);

      // Should find CSS selectors
      const classSelector = result!.fragments.find((f) =>
        f.name.includes('.my-class'),
      );
      const idSelector = result!.fragments.find((f) =>
        f.name.includes('#my-id'),
      );

      expect(classSelector || idSelector).toBeTruthy();
    });
  });
});
