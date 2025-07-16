import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GenMapping, addMapping, toEncodedMap } from '@jridgewell/gen-mapping';
import { SourceMapData } from '../models/bundle.models';
import { BundleCalculationService } from './bundle-calculation.service';
import { BundleService } from './bundle.service';
import { SourceMapProcessorService } from './source-map-processor.service';
import { StorageService } from './storage.service';

async function clearOriginPrivateStorage() {
  const dir = await navigator.storage.getDirectory();
  for await (const [name, handle] of dir) {
    if (handle.kind === 'file') {
      await dir.removeEntry(name);
    } else if (handle.kind === 'directory') {
      await dir.removeEntry(name, { recursive: true });
    }
  }
}

describe('BundleService', () => {
  let service: BundleService;
  let storageService: StorageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BundleCalculationService,
        SourceMapProcessorService,
      ],
    });
    service = TestBed.inject(BundleService);
    storageService = TestBed.inject(StorageService);

    // Clear storage before each test
    await clearOriginPrivateStorage();
  });

  afterEach(async () => {
    await clearOriginPrivateStorage();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadBundle', () => {
    it('should load bundle with single chunk', async () => {
      const mockChunkContent = `
        /***/ (function(module, exports) {
          console.log('test module');
        /***/ }),
      `;

      const mockChunk = new File([mockChunkContent], 'main.js', {
        type: 'application/javascript',
      });

      await service.loadBundle([mockChunk]);

      expect(service.bundle()).toBeTruthy();
      expect(service.bundle()?.chunks.length).toBe(1);
      expect(service.bundle()?.chunks[0].fileName).toBe('main.js');
      expect(service.loading()).toBe(false);
    });

    it('should load bundle with source map', async () => {
      const mockSourceMap: SourceMapData = {
        version: 3,
        sources: ['src/main.ts'],
        names: ['console', 'log'],
        mappings: 'AAAA,OAAO,CAAC,GAAG',
        sourcesContent: ['console.log("Hello World");'],
      };

      const mockChunkContent = 'console.log("Hello World");';
      const mockChunk = new File([mockChunkContent], 'main.js', {
        type: 'application/javascript',
      });
      const mockSourceMapFile = new File(
        [JSON.stringify(mockSourceMap)],
        'main.js.map',
        { type: 'application/json' },
      );

      await service.loadBundle([mockChunk, mockSourceMapFile]);

      const bundle = service.bundle();
      expect(bundle?.chunks[0].sourceMap).toBeTruthy();
      expect(bundle?.chunks[0].sourceMap?.sources).toContain('src/main.ts');
    });

    it('should handle inline source maps', async () => {
      const mockSourceMap: SourceMapData = {
        version: 3,
        sources: ['src/main.ts'],
        names: [],
        mappings: 'AAAA',
      };

      const encodedSourceMap = btoa(JSON.stringify(mockSourceMap));
      const mockChunkContent = `console.log("test");
//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;

      const mockChunk = new File([mockChunkContent], 'main.js', {
        type: 'application/javascript',
      });

      await service.loadBundle([mockChunk]);

      const bundle = service.bundle();
      expect(bundle?.chunks[0].sourceMap).toBeTruthy();
      expect(bundle?.chunks[0].sourceMap?.sources).toContain('src/main.ts');
    });

    it('should set loading state correctly', async () => {
      const mockChunk = new File(['test content'], 'test.js');

      expect(service.loading()).toBe(false);

      const loadPromise = service.loadBundle([mockChunk]);
      expect(service.loading()).toBe(true);

      await loadPromise;
      expect(service.loading()).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const invalidChunk = new File([''], 'test.js');
      // Mock FileReader to throw error
      spyOn(FileReader.prototype, 'readAsText').and.callFake(function (
        this: FileReader,
      ) {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror.call(this, {} as ProgressEvent<FileReader>);
          }
        }, 0);
      });

      await service.loadBundle([invalidChunk]);

      expect(service.errorMessage()).toBeTruthy();
      expect(service.bundle()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('getChunkById', () => {
    beforeEach(async () => {
      const mockChunk = new File(['test content'], 'main.js');
      await service.loadBundle([mockChunk]);
    });

    it('should return chunk by id', () => {
      const chunk = service.getChunkById('main');
      expect(chunk).toBeTruthy();
      expect(chunk?.fileName).toBe('main.js');
    });

    it('should return undefined for non-existent id', () => {
      const chunk = service.getChunkById('nonexistent');
      expect(chunk).toBeUndefined();
    });
  });

  describe('getSourceContent', () => {
    it('return contents from source map', async () => {
      const mockSourceMap: SourceMapData = {
        version: 3,
        sources: ['src/main.ts'],
        sourcesContent: ['console.log("Hello World");'],
        names: [],
        mappings: 'AAAA',
      };

      const encodedSourceMap = btoa(JSON.stringify(mockSourceMap));
      const mockChunkContent = `console.log("test");
//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;

      const mockChunk = new File([mockChunkContent], 'main.js', {
        type: 'application/javascript',
      });

      await service.loadBundle([mockChunk]);

      expect(service.getSourceContent('src/main.ts')).toBe(
        'console.log("Hello World");',
      );
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const mockChunk = new File(['test content'], 'main.js');
      await service.loadBundle([mockChunk]);

      expect(service.bundle()).toBeTruthy();

      service.reset();

      expect(service.bundle()).toBeNull();
      expect(service.errorMessage()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('bundle analysis', () => {
    it('should calculate total size correctly', async () => {
      const content1 = 'a'.repeat(100);
      const content2 = 'b'.repeat(200);

      const chunk1 = new File([content1], 'chunk1.js');
      const chunk2 = new File([content2], 'chunk2.js');

      await service.loadBundle([chunk1, chunk2]);

      const bundle = service.bundle();
      expect(bundle?.totalSize).toBe(300);
    });

    it('should attribute size to source files', async () => {
      const mapGen = new GenMapping();
      addMapping(mapGen, {
        source: 'src/a.ts',
        original: { line: 1, column: 0 },
        generated: { line: 1, column: 0 },
      });
      addMapping(mapGen, {
        source: 'src/b.ts',
        original: { line: 1, column: 0 },
        generated: { line: 1, column: 20 },
      });
      const content = `${'a'.repeat(100)}\n\n//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(toEncodedMap(mapGen)))}`;

      const chunk = new File([content], 'chunk1.js');

      await service.loadBundle([chunk]);

      const bundle = service.bundle();
      expect(bundle?.totalSize).toBeGreaterThan(100);

      expect(bundle?.sourceBreakdown.get('src/a.ts')).toBe(20);
      expect(bundle?.sourceBreakdown.get('src/b.ts')).toBe(80);
    });
  });
});
