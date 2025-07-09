import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StorageService } from './storage.service';
import { BundleAnalysis } from '../models/bundle.models';

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

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    await clearOriginPrivateStorage();
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadBundleAnalysis', () => {
    it('should load valid bundle analysis from storage', async () => {
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

    it('should return null when no data exists', async () => {
      const loaded = await service.loadBundleAnalysis();
      expect(loaded).toBeNull();
    });
  });

  describe('hasSavedBundleAnalysis', () => {
    it('should return true when valid data exists', async () => {
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
  });

  describe('getBundleAnalysisAge', () => {
    it('should return correct age for saved data', async () => {
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1000,
        chunks: [],
        sourceBreakdown: new Map(),
        mappingImpacts: new Map(),
      };

      await service.saveBundleAnalysis(mockAnalysis);
      const age = await service.getBundleAnalysisAge();

      expect(age).toBeDefined();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000); // Should be very recent
    });

    it('should return null when no data exists', async () => {
      const age = await service.getBundleAnalysisAge();
      expect(age).toBeNull();
    });
  });
});
