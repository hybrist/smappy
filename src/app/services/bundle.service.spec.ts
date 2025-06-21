import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BundleService } from './bundle.service';
import { BundleConfig, ChunkInfo, SourceMapData } from '../models/bundle.models';

describe('BundleService', () => {
  let service: BundleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
    service = TestBed.inject(BundleService);
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
      
      const mockChunk = new File([mockChunkContent], 'main.js', { type: 'application/javascript' });
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
        sourcesContent: ['console.log("Hello World");']
      };

      const mockChunkContent = 'console.log("Hello World");';
      const mockChunk = new File([mockChunkContent], 'main.js', { type: 'application/javascript' });
      const mockSourceMapFile = new File([JSON.stringify(mockSourceMap)], 'main.js.map', { type: 'application/json' });
      
      const config: BundleConfig = { 
        chunks: [mockChunk],
        sourceMaps: [mockSourceMapFile]
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
        mappings: 'AAAA'
      };

      const encodedSourceMap = btoa(JSON.stringify(mockSourceMap));
      const mockChunkContent = `console.log("test");
//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`;
      
      const mockChunk = new File([mockChunkContent], 'main.js', { type: 'application/javascript' });
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
      spyOn(FileReader.prototype, 'readAsText').and.callFake(function(this: FileReader) {
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
  });
});