import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StorageService } from './storage.service';
import { BundleAnalysis } from '../models/bundle.models';

describe('StorageService', () => {
  let service: StorageService;
  let mockDirectoryHandle: any;
  let mockFileHandle: any;
  let mockWritable: any;

  beforeEach(() => {
    // Mock FileSystemDirectoryHandle
    mockDirectoryHandle = {
      getFileHandle: jasmine
        .createSpy('getFileHandle')
        .and.returnValue(Promise.resolve(mockFileHandle)),
      removeEntry: jasmine
        .createSpy('removeEntry')
        .and.returnValue(Promise.resolve()),
      entries: jasmine
        .createSpy('entries')
        .and.returnValue(Promise.resolve([].entries())),
    };

    // Mock FileSystemFileHandle
    mockFileHandle = {
      createWritable: jasmine
        .createSpy('createWritable')
        .and.returnValue(Promise.resolve(mockWritable)),
      getFile: jasmine
        .createSpy('getFile')
        .and.returnValue(
          Promise.resolve(new File(['{"test": "data"}'], 'bundle-123.json')),
        ),
    };

    // Mock FileSystemWritableFileStream
    mockWritable = {
      write: jasmine.createSpy('write').and.returnValue(Promise.resolve()),
      close: jasmine.createSpy('close').and.returnValue(Promise.resolve()),
    };

    // Mock navigator.storage.getDirectory
    spyOn(navigator.storage, 'getDirectory').and.returnValue(
      Promise.resolve({
        getDirectoryHandle: jasmine
          .createSpy('getDirectoryHandle')
          .and.returnValue(Promise.resolve(mockDirectoryHandle)),
      } as any),
    );

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveBundleAnalysis', () => {
    it('should save bundle analysis to file system', async () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [
          {
            id: 'main',
            fileName: 'main.js',
            size: 1000,
            content: 'test content',
            sourceMap: {
              version: 3,
              sources: ['src/main.ts'],
              names: [],
              mappings: 'AAAA',
            },
          },
        ],
        sourceBreakdown: new Map([['src/main.ts', 500]]),
        mappingImpacts: new Map(),
      };

      await service.saveBundleAnalysis(mockAnalysis);

      expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalled();
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [],
        sourceBreakdown: new Map(),
        mappingImpacts: new Map(),
      };

      // Mock localStorage.setItem to throw
      spyOn(localStorage, 'setItem').and.throwError('Storage quota exceeded');
      spyOn(console, 'warn');

      expect(() => service.saveBundleAnalysis(mockAnalysis)).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save bundle analysis to localStorage:',
        jasmine.any(Error),
      );
    });
  });

  describe('loadBundleAnalysis', () => {
    it('should load valid bundle analysis from localStorage', () => {
      const mockAnalysis: BundleAnalysis = {
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

      await service.saveBundleAnalysis(mockAnalysis);
      const loaded = await service.loadBundleAnalysis();

      expect(loaded).toBeTruthy();
      expect(loaded?.totalSize).toBe(1000);
      expect(loaded?.chunks.length).toBe(1);
      expect(loaded?.sourceBreakdown.get('src/main.ts')).toBe(500);
    });

    it('should return null for expired data', () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [],
        sourceBreakdown: new Map(),
        mappingImpacts: new Map(),
      };

      // Set an old timestamp (31 days ago)
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorage.setItem('smappy_bundle_timestamp', oldTimestamp.toString());
      localStorage.setItem(
        'smappy_bundle_analysis',
        JSON.stringify({
          totalSize: mockAnalysis.totalSize,
          chunks: mockAnalysis.chunks,
          sourceBreakdown: Array.from(mockAnalysis.sourceBreakdown.entries()),
        }),
      );

      const loaded = service.loadBundleAnalysis();
      expect(loaded).toBeNull();

      // Should also clear the expired data
      expect(localStorage.getItem('smappy_bundle_analysis')).toBeNull();
      expect(localStorage.getItem('smappy_bundle_timestamp')).toBeNull();
    });

    it('should return null when no data exists', () => {
      const loaded = service.loadBundleAnalysis();
      expect(loaded).toBeNull();
    });

    it('should handle corrupted data gracefully', () => {
      localStorage.setItem('smappy_bundle_timestamp', Date.now().toString());
      localStorage.setItem('smappy_bundle_analysis', 'invalid json');
      spyOn(console, 'warn');

      const loaded = service.loadBundleAnalysis();

      expect(loaded).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load bundle analysis from localStorage:',
        jasmine.any(Error),
      );

      // Should clear the corrupted data
      expect(localStorage.getItem('smappy_bundle_analysis')).toBeNull();
    });
  });

  describe('clearBundleAnalysis', () => {
    it('should clear all bundle data from localStorage', () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [],
        sourceBreakdown: new Map(),
        mappingImpacts: new Map(),
      };

      service.saveBundleAnalysis(mockAnalysis);
      expect(localStorage.getItem('smappy_bundle_analysis')).toBeTruthy();

      service.clearBundleAnalysis();
      expect(localStorage.getItem('smappy_bundle_analysis')).toBeNull();
      expect(localStorage.getItem('smappy_bundle_timestamp')).toBeNull();
    });
  });

  describe('hasSavedBundleAnalysis', () => {
    it('should return true when valid data exists', () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [],
        sourceBreakdown: new Map(),
        mappingImpacts: new Map(),
      };

      await service.saveBundleAnalysis(mockAnalysis);
      expect(await service.hasSavedBundleAnalysis()).toBe(true);
    });

    it('should return false when no data exists', async () => {
      expect(await service.hasSavedBundleAnalysis()).toBe(false);
    });

    it('should return false when data is expired', () => {
      // Set old timestamp
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorage.setItem('smappy_bundle_timestamp', oldTimestamp.toString());
      localStorage.setItem('smappy_bundle_analysis', '{}');

      expect(await service.hasSavedBundleAnalysis()).toBe(false);
    });
  });

  describe('getBundleAnalysisAge', () => {
    it('should return correct age for saved data', () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [],
        sourceBreakdown: new Map(),
        mappingImpacts: new Map(),
      };

      service.saveBundleAnalysis(mockAnalysis);
      const age = service.getBundleAnalysisAge();

      expect(age).toBeDefined();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000); // Should be very recent
    });

    it('should return null when no data exists', () => {
      const age = service.getBundleAnalysisAge();
      expect(age).toBeNull();
    });
  });
});
