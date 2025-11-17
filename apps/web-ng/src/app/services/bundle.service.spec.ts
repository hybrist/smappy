import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GenMapping, addMapping, toEncodedMap } from '@jridgewell/gen-mapping';
import { SourceMapData } from '../models/bundle.models';
import { InputBundle } from '../models/storage';
import { BundleCalculationService } from './bundle-calculation.service';
import { BundleService } from './bundle.service';
import { SourceMapProcessorService } from './source-map-processor.service';
import { StorageService } from './storage.service';

const THE_BUNDLE_ID = 'test-bundle-id';

describe('BundleService', () => {
  let service: BundleService;
  let storageServiceSpy: jasmine.SpyObj<StorageService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('StorageService', [
      'loadBundleMetadata',
      'loadAllFileContents',
      'storeBundle',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BundleCalculationService,
        SourceMapProcessorService,
        {
          provide: StorageService,
          useValue: spy,
        },
      ],
    });
    service = TestBed.inject(BundleService);
    storageServiceSpy = TestBed.inject(
      StorageService,
    ) as jasmine.SpyObj<StorageService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadParsedBundle', () => {
    xit('should load and parse a bundle with source maps', async () => {
      // Create a test source map using GenMapping
      const map = new GenMapping();
      addMapping(map, {
        source: 'src/app.ts',
        original: { line: 1, column: 0 },
        generated: { line: 1, column: 0 },
      });
      addMapping(map, {
        source: 'src/app.ts',
        original: { line: 2, column: 0 },
        generated: { line: 1, column: 20 },
      });
      addMapping(map, {
        source: 'src/utils.ts',
        original: { line: 1, column: 0 },
        generated: { line: 2, column: 0 },
      });

      const sourceMapData = toEncodedMap(map) as SourceMapData;
      // Create a new object with sourcesContent added
      const sourceMapWithContent = {
        ...sourceMapData,
        sourcesContent: [
          'console.log("hello");\nexport default app;',
          'export function helper() {}',
        ],
      };

      // Mock bundle metadata
      const mockBundleMetadata: InputBundle = {
        id: THE_BUNDLE_ID,
        name: 'Test Bundle',
        importedAt: Date.now(),
        files: [
          { name: 'main.js', storagePath: 'bundles/test/main.js' },
          { name: 'main.js.map', storagePath: 'bundles/test/main.js.map' },
        ],
      };

      // Mock file contents
      const mockFileContents = new Map<string, string>([
        [
          'bundles/test/main.js',
          'console.log("bundled");\nfunction helper(){}',
        ],
        ['bundles/test/main.js.map', JSON.stringify(sourceMapWithContent)],
      ]);

      // Setup spies
      storageServiceSpy.loadBundleMetadata.and.returnValue(
        Promise.resolve(mockBundleMetadata),
      );
      storageServiceSpy.loadAllFileContents.and.returnValue(
        Promise.resolve(mockFileContents),
      );

      // Execute
      const result = await service.loadParsedBundle(THE_BUNDLE_ID);

      // Verify basic structure
      expect(result.id).toBe(THE_BUNDLE_ID);
      expect(result.name).toBe('Test Bundle');
      expect(result.chunks).toHaveSize(1);
      expect(result.sources).toHaveSize(2);

      // Verify chunk structure
      const chunk = result.chunks[0];
      expect(chunk.id).toBe('main');
      expect(chunk.name).toBe('main.js');
      expect(chunk.size).toBe(41); // Length of mock content
      expect(chunk.fragments).toHaveSize(3); // 3 mappings = 3 fragments

      // Verify sources structure
      const sources = Array.from(result.sourcesByPath.values());
      expect(sources).toHaveSize(2);

      const appSource = result.sourcesByPath.get('src/app.ts');
      expect(appSource).toBeDefined();
      expect(appSource!.path).toBe('src/app.ts');
      expect(appSource!.content).toBe(
        'console.log("hello");\nexport default app;',
      );
      expect(appSource!.referencingChunks.has('main')).toBeTrue();

      const utilsSource = result.sourcesByPath.get('src/utils.ts');
      expect(utilsSource).toBeDefined();
      expect(utilsSource!.path).toBe('src/utils.ts');
      expect(utilsSource!.content).toBe('export function helper() {}');
      expect(utilsSource!.referencingChunks.has('main')).toBeTrue();

      // Verify fragments
      const fragments = chunk.fragments;
      expect(fragments[0].sourceId).toBe(0); // Points to src/app.ts
      expect(fragments[0].sourcePosition).toEqual({ line: 1, column: 0 });
      expect(fragments[1].sourceId).toBe(0); // Points to src/app.ts
      expect(fragments[1].sourcePosition).toEqual({ line: 2, column: 0 });
      expect(fragments[2].sourceId).toBe(1); // Points to src/utils.ts
      expect(fragments[2].sourcePosition).toEqual({ line: 1, column: 0 });

      // Verify lookup maps
      expect(result.chunksByName.get('main.js')).toBe(chunk);
      expect(result.sourcesByPath.get('src/app.ts')).toBe(appSource);
      expect(result.sourcesByPath.get('src/utils.ts')).toBe(utilsSource);
    });

    it('should handle chunks without source maps', async () => {
      // Mock bundle metadata with no source map file
      const mockBundleMetadata: InputBundle = {
        id: THE_BUNDLE_ID,
        name: 'Test Bundle No Maps',
        importedAt: Date.now(),
        files: [{ name: 'vendor.js', storagePath: 'bundles/test/vendor.js' }],
      };

      const mockFileContents = new Map<string, string>([
        ['bundles/test/vendor.js', 'var lib = {};\nlib.version = "1.0";'],
      ]);

      storageServiceSpy.loadBundleMetadata.and.returnValue(
        Promise.resolve(mockBundleMetadata),
      );
      storageServiceSpy.loadAllFileContents.and.returnValue(
        Promise.resolve(mockFileContents),
      );

      const result = await service.loadParsedBundle(THE_BUNDLE_ID);

      expect(result.chunks).toHaveSize(1);
      expect(result.sources).toHaveSize(0); // No sources without source map

      const chunk = result.chunks[0];
      expect(chunk.id).toBe('vendor');
      expect(chunk.fragments).toHaveSize(1); // Single fragment for entire chunk

      const fragment = chunk.fragments[0];
      expect(fragment.sourceId).toBeUndefined();
      expect(fragment.sourcePosition).toBeUndefined();
      expect(fragment.size).toBe(chunk.size);
    });

    it('should throw error when bundle not found', async () => {
      storageServiceSpy.loadBundleMetadata.and.returnValue(
        Promise.resolve(null),
      );

      await expectAsync(
        service.loadParsedBundle('non-existent-bundle'),
      ).toBeRejectedWithError('Bundle non-existent-bundle not found');
    });

    it('should handle multiple chunks with shared sources', async () => {
      // Create source maps for two chunks that reference the same source
      const map1 = new GenMapping();
      addMapping(map1, {
        source: 'src/shared.ts',
        original: { line: 1, column: 0 },
        generated: { line: 1, column: 0 },
      });

      const map2 = new GenMapping();
      addMapping(map2, {
        source: 'src/shared.ts',
        original: { line: 10, column: 0 },
        generated: { line: 1, column: 0 },
      });

      const sourceMapData1 = toEncodedMap(map1) as SourceMapData;
      const sourceMapData2 = toEncodedMap(map2) as SourceMapData;

      const mockBundleMetadata: InputBundle = {
        id: THE_BUNDLE_ID,
        name: 'Multi Chunk Bundle',
        importedAt: Date.now(),
        files: [
          { name: 'chunk1.js', storagePath: 'bundles/test/chunk1.js' },
          { name: 'chunk1.js.map', storagePath: 'bundles/test/chunk1.js.map' },
          { name: 'chunk2.js', storagePath: 'bundles/test/chunk2.js' },
          { name: 'chunk2.js.map', storagePath: 'bundles/test/chunk2.js.map' },
        ],
      };

      const mockFileContents = new Map<string, string>([
        ['bundles/test/chunk1.js', 'console.log("chunk1");'],
        ['bundles/test/chunk1.js.map', JSON.stringify(sourceMapData1)],
        ['bundles/test/chunk2.js', 'console.log("chunk2");'],
        ['bundles/test/chunk2.js.map', JSON.stringify(sourceMapData2)],
      ]);

      storageServiceSpy.loadBundleMetadata.and.returnValue(
        Promise.resolve(mockBundleMetadata),
      );
      storageServiceSpy.loadAllFileContents.and.returnValue(
        Promise.resolve(mockFileContents),
      );

      const result = await service.loadParsedBundle(THE_BUNDLE_ID);

      expect(result.chunks).toHaveSize(2);
      expect(result.sources).toHaveSize(1); // Only one shared source

      const sharedSource = result.sourcesByPath.get('src/shared.ts');
      expect(sharedSource).toBeDefined();
      expect(sharedSource!.referencingChunks).toHaveSize(2);
      expect(sharedSource!.referencingChunks.has('chunk1')).toBeTrue();
      expect(sharedSource!.referencingChunks.has('chunk2')).toBeTrue();
    });
  });
});
