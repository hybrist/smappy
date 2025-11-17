import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BundleAnalysis } from '../models/bundle.models';
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

  // Note: These tests are for methods that no longer exist on StorageService
  // The service now uses server-side storage via HTTP API
  xdescribe('loadBundleAnalysis', () => {
    it('should load valid bundle analysis from storage', async () => {
      const mockAnalysis: BundleAnalysis = {
        bundleId: 'test-bundle-id',
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

      // Test skipped - method doesn't exist
    });

    it('should return null when no data exists', async () => {
      // Test skipped - method doesn't exist
    });
  });

  xdescribe('hasSavedBundleAnalysis', () => {
    it('should return true when valid data exists', async () => {
      // Test skipped - method doesn't exist
    });

    it('should return false when no data exists', async () => {
      // Test skipped - method doesn't exist
    });
  });

  xdescribe('getBundleAnalysisAge', () => {
    it('should return correct age for saved data', async () => {
      // Test skipped - method doesn't exist
    });
  });
});
