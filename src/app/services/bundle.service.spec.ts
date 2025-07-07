import { TestBed } from '@angular/core/testing';
import { GenMapping, addMapping, toEncodedMap } from '@jridgewell/gen-mapping';
import { provideZonelessChangeDetection } from '@angular/core';
import { BundleService } from './bundle.service';
import { StorageService } from './storage.service';
import { BundleCalculationService } from './bundle-calculation.service';
import { SourceMapProcessorService } from './source-map-processor.service';
import { BundleConfig, SourceMapData } from '../models/bundle.models';

describe('BundleService', () => {
  let service: BundleService;
  let storageService: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BundleCalculationService,
        SourceMapProcessorService,
      ],
    });
    service = TestBed.inject(BundleService);
    storageService = TestBed.inject(StorageService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
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
      const config: BundleConfig = { chunks: [mockChunk] };

      await service.loadBundle(config);

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

      const config: BundleConfig = {
        chunks: [mockChunk],
        sourceMaps: [mockSourceMapFile],
      };

      await service.loadBundle(config);

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
      const config: BundleConfig = { chunks: [mockChunk] };

      await service.loadBundle(config);

      const bundle = service.bundle();
      expect(bundle?.chunks[0].sourceMap).toBeTruthy();
      expect(bundle?.chunks[0].sourceMap?.sources).toContain('src/main.ts');
    });

    it('should set loading state correctly', async () => {
      const mockChunk = new File(['test content'], 'test.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      expect(service.loading()).toBe(false);

      const loadPromise = service.loadBundle(config);
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

      const config: BundleConfig = { chunks: [invalidChunk] };

      await service.loadBundle(config);

      expect(service.errorMessage()).toBeTruthy();
      expect(service.bundle()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('getChunkById', () => {
    beforeEach(async () => {
      const mockChunk = new File(['test content'], 'main.js');
      const config: BundleConfig = { chunks: [mockChunk] };
      await service.loadBundle(config);
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
      const config: BundleConfig = { chunks: [mockChunk] };

      await service.loadBundle(config);

      expect(service.getSourceContent('src/main.ts')).toBe(
        'console.log("Hello World");',
      );
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const mockChunk = new File(['test content'], 'main.js');
      const config: BundleConfig = { chunks: [mockChunk] };
      await service.loadBundle(config);

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

      const config: BundleConfig = { chunks: [chunk1, chunk2] };
      await service.loadBundle(config);

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

      const config: BundleConfig = { chunks: [chunk] };
      await service.loadBundle(config);

      const bundle = service.bundle();
      expect(bundle?.totalSize).toBeGreaterThan(100);

      expect(bundle?.sourceBreakdown.get('src/a.ts')).toBe(20);
      expect(bundle?.sourceBreakdown.get('src/b.ts')).toBe(80);
    });
  });

  describe('localStorage persistence', () => {
    it('should save bundle to localStorage after analysis', async () => {
      const mockChunk = new File(['test content'], 'main.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      await service.loadBundle(config);

      expect(await storageService.hasSavedBundleAnalysis()).toBe(true);
      const savedBundle = await storageService.loadBundleAnalysis();
      expect(savedBundle?.totalSize).toBe(service.bundle()?.totalSize);
    });

    it('should restore bundle from localStorage on initialization', () => {
      // Save a bundle to localStorage first
      const mockBundle = {
        totalSize: 1000,
        chunks: [
          {
            id: 'main',
            fileName: 'main.js',
            size: 1000,
            content: 'test content',
          },
        ],
        sourceBreakdown: new Map([['src/main.ts', 500]]),
        mappingImpacts: new Map(),
      };

      storageService.saveBundleAnalysis(mockBundle);

      // Create a new TestBed to get a fresh service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      const newService = TestBed.inject(BundleService);

      expect(newService.bundle()).toBeTruthy();
      expect(newService.bundle()?.totalSize).toBe(1000);
    });

    it('should clear localStorage when reset is called', async () => {
      const mockChunk = new File(['test content'], 'main.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      await service.loadBundle(config);
      expect(await storageService.hasSavedBundleAnalysis()).toBe(true);

      await service.reset();

      expect(await storageService.hasSavedBundleAnalysis()).toBe(false);
      expect(service.bundle()).toBeNull();
    });

    it('should provide bundle age information', async () => {
      const mockChunk = new File(['test content'], 'main.js');
      const config: BundleConfig = { chunks: [mockChunk] };

      await service.loadBundle(config);

      const age = service.getBundleAge();
      expect(age).toBeDefined();
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Put invalid data in localStorage
      localStorage.setItem('smappy_bundle_analysis', 'invalid json');
      localStorage.setItem('smappy_bundle_timestamp', Date.now().toString());

      spyOn(console, 'warn');

      // Create a new TestBed to get a fresh service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      const newService = TestBed.inject(BundleService);

      expect(newService.bundle()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
