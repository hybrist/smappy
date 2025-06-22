import { Injectable } from '@angular/core';
import {
  BundleAnalysis,
  SerializableBundleAnalysis,
} from '../models/bundle.models';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly BUNDLE_KEY = 'smappy_bundle_analysis';
  private readonly BUNDLE_TIMESTAMP_KEY = 'smappy_bundle_timestamp';
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  saveBundleAnalysis(analysis: BundleAnalysis): void {
    try {
      const serializable: SerializableBundleAnalysis = {
        totalSize: analysis.totalSize,
        chunks: analysis.chunks,
        sourceBreakdown: Array.from(analysis.sourceBreakdown.entries()),
      };

      localStorage.setItem(this.BUNDLE_KEY, JSON.stringify(serializable));
      localStorage.setItem(this.BUNDLE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save bundle analysis to localStorage:', error);
    }
  }

  loadBundleAnalysis(): BundleAnalysis | null {
    try {
      const timestampStr = localStorage.getItem(this.BUNDLE_TIMESTAMP_KEY);
      if (!timestampStr) return null;

      const timestamp = parseInt(timestampStr, 10);
      const age = Date.now() - timestamp;

      // Check if data is too old
      if (age > this.MAX_AGE_MS) {
        this.clearBundleAnalysis();
        return null;
      }

      const dataStr = localStorage.getItem(this.BUNDLE_KEY);
      if (!dataStr) return null;

      const serializable: SerializableBundleAnalysis = JSON.parse(dataStr);

      return {
        totalSize: serializable.totalSize,
        chunks: serializable.chunks,
        sourceBreakdown: new Map(serializable.sourceBreakdown),
      };
    } catch (error) {
      console.warn('Failed to load bundle analysis from localStorage:', error);
      this.clearBundleAnalysis();
      return null;
    }
  }

  clearBundleAnalysis(): void {
    try {
      localStorage.removeItem(this.BUNDLE_KEY);
      localStorage.removeItem(this.BUNDLE_TIMESTAMP_KEY);
    } catch (error) {
      console.warn('Failed to clear bundle analysis from localStorage:', error);
    }
  }

  hasSavedBundleAnalysis(): boolean {
    const timestampStr = localStorage.getItem(this.BUNDLE_TIMESTAMP_KEY);
    if (!timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;

    return age <= this.MAX_AGE_MS && !!localStorage.getItem(this.BUNDLE_KEY);
  }

  getBundleAnalysisAge(): number | null {
    const timestampStr = localStorage.getItem(this.BUNDLE_TIMESTAMP_KEY);
    if (!timestampStr) return null;

    const timestamp = parseInt(timestampStr, 10);
    return Date.now() - timestamp;
  }
}
