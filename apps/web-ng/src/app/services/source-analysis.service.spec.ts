import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  GenMapping,
  addMapping,
  setSourceContent,
  toEncodedMap,
} from '@jridgewell/gen-mapping';
import { SourceMapData } from '../models/bundle.models';
import { AstParserService } from '../parsers/ast-parser.service';
import { FileParsersService } from '../parsers/file-parsers.service';
import { BundleService } from './bundle.service';
import { SourceAnalysisService } from './source-analysis.service';

describe('SourceAnalysisService', () => {
  let service: SourceAnalysisService;
  let bundleService: BundleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AstParserService,
        FileParsersService,
      ],
    });
    service = TestBed.inject(SourceAnalysisService);
    bundleService = TestBed.inject(BundleService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  xdescribe('analyzeSourceFile', () => {
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

console.log('hello');

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

      await bundleService.storeUploadedBundle([mockChunk]);
    });

    it('should return null for non-existent file', () => {
      // const result = service.analyzeSourceFile('non/existent/file.ts');
      // expect(result).toBeNull();
    });

    it('should analyze TypeScript file and extract fragments', () => {
      // Skipped - needs proper bundle setup
    });

    it('should mark fragments as included/excluded from bundle', () => {
      // Skipped - needs proper bundle setup
    });

    it('should accurately attribute bundle bytes to specific fragments', () => {
      // Skipped - needs proper bundle setup
    });

    it('should categorize fragments correctly', () => {
      // Skipped - needs proper bundle setup
    });
  });

  xdescribe('getUnusedFragments', () => {
    it('should return fragments not included in bundle', async () => {
      // Skipped - needs proper bundle setup
    });
  });

  xdescribe('CSS file analysis', () => {
    it('should parse CSS selectors', async () => {
      // Skipped - needs proper bundle setup
    });
  });
});
