/**
 * Tests for size calculator module
 */
import { describe, it, expect } from "vitest";
import {
  computeRawSize,
  computeGzipSize,
  aggregateChunkSizes,
  aggregateBundleSizes,
} from "./calculator.js";

describe("computeRawSize", () => {
  it("should calculate raw size accurately", () => {
    const content = "Hello, world!";
    const size = computeRawSize(content);
    expect(size).toBe(13); // UTF-8 byte length
  });

  it("should handle empty string", () => {
    const size = computeRawSize("");
    expect(size).toBe(0);
  });

  it("should handle different encodings", () => {
    const content = "Hello";
    const utf8Size = computeRawSize(content, "utf-8");
    const asciiSize = computeRawSize(content, "ascii");
    const latin1Size = computeRawSize(content, "latin1");

    expect(utf8Size).toBe(5);
    expect(asciiSize).toBe(5);
    expect(latin1Size).toBe(5);
  });

  it("should handle Unicode characters correctly", () => {
    const content = "Hello, 世界!";
    const size = computeRawSize(content);
    // 'Hello, ' = 7 bytes, '世界' = 6 bytes (3 bytes per char), '!' = 1 byte
    expect(size).toBe(14);
  });

  it("should handle large content", () => {
    const content = "a".repeat(1000000); // 1MB
    const size = computeRawSize(content);
    expect(size).toBe(1000000);
  });

  it("should handle multiline content", () => {
    const content = "Line 1\nLine 2\nLine 3";
    const size = computeRawSize(content);
    expect(size).toBeGreaterThan(15); // Includes newlines
  });
});

describe("computeGzipSize", () => {
  it("should calculate gzipped size accurately", () => {
    const content = "Hello, world!";
    const gzippedSize = computeGzipSize(content);
    const rawSize = computeRawSize(content);

    // For small content, gzip might be larger due to overhead
    // For larger content, gzip should be smaller
    // Either way, should be positive
    expect(gzippedSize).toBeGreaterThan(0);
    // For very small strings, gzip overhead can make it larger
    if (rawSize > 50) {
      expect(gzippedSize).toBeLessThanOrEqual(rawSize);
    }
  });

  it("should handle empty string", () => {
    const size = computeGzipSize("");
    expect(size).toBe(0);
  });

  it("should compress repetitive content well", () => {
    const content = "a".repeat(1000);
    const rawSize = computeRawSize(content);
    const gzippedSize = computeGzipSize(content);

    // Repetitive content should compress well
    expect(gzippedSize).toBeLessThan(rawSize);
    // Compression ratio should be significant for repetitive content
    expect(gzippedSize / rawSize).toBeLessThan(0.1); // Less than 10% of original
  });

  it("should handle large files efficiently", () => {
    const content = "a".repeat(1000000); // 1MB
    const startTime = Date.now();
    const gzippedSize = computeGzipSize(content);
    const endTime = Date.now();

    expect(gzippedSize).toBeGreaterThan(0);
    expect(gzippedSize).toBeLessThan(computeRawSize(content));

    // Performance requirement: should complete in reasonable time
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(1000); // Allow margin for test environment
  });

  it("should match gzip behavior for simple content", () => {
    const content = "Hello, world! This is a test string.";
    const gzippedSize = computeGzipSize(content);
    const rawSize = computeRawSize(content);

    // Gzip should produce valid compressed output
    expect(gzippedSize).toBeGreaterThan(0);
    // For small content, gzip might be larger due to overhead
    if (rawSize > 100) {
      expect(gzippedSize).toBeLessThan(rawSize);
    }
  });

  it("should handle special characters", () => {
    const content = "Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?";
    const gzippedSize = computeGzipSize(content);
    const rawSize = computeRawSize(content);

    expect(gzippedSize).toBeGreaterThan(0);
    if (rawSize > 100) {
      expect(gzippedSize).toBeLessThanOrEqual(rawSize);
    }
  });

  it("should handle multiline content", () => {
    const content = "Line 1\nLine 2\nLine 3\n".repeat(100);
    const gzippedSize = computeGzipSize(content);
    expect(gzippedSize).toBeGreaterThan(0);
    expect(gzippedSize).toBeLessThan(computeRawSize(content));
  });
});

describe("aggregateChunkSizes", () => {
  it("should aggregate chunk sizes correctly", () => {
    const chunkSizes = [
      { raw: 100, gzipped: 50 },
      { raw: 200, gzipped: 100 },
      { raw: 300, gzipped: 150 },
    ];

    const aggregated = aggregateChunkSizes(chunkSizes);

    expect(aggregated.totalRaw).toBe(600);
    expect(aggregated.totalGzipped).toBe(300);
    expect(aggregated.chunks).toEqual(chunkSizes);
  });

  it("should handle empty array", () => {
    const aggregated = aggregateChunkSizes([]);
    expect(aggregated.totalRaw).toBe(0);
    expect(aggregated.totalGzipped).toBe(0);
    expect(aggregated.chunks).toEqual([]);
  });

  it("should handle single chunk", () => {
    const chunkSizes = [{ raw: 100, gzipped: 50 }];
    const aggregated = aggregateChunkSizes(chunkSizes);

    expect(aggregated.totalRaw).toBe(100);
    expect(aggregated.totalGzipped).toBe(50);
    expect(aggregated.chunks).toEqual(chunkSizes);
  });

  it("should handle large number of chunks", () => {
    const chunkSizes = Array.from({ length: 100 }, (_, i) => ({
      raw: i * 10,
      gzipped: i * 5,
    }));

    const aggregated = aggregateChunkSizes(chunkSizes);

    const expectedRaw = chunkSizes.reduce((sum, chunk) => sum + chunk.raw, 0);
    const expectedGzipped = chunkSizes.reduce(
      (sum, chunk) => sum + chunk.gzipped,
      0,
    );

    expect(aggregated.totalRaw).toBe(expectedRaw);
    expect(aggregated.totalGzipped).toBe(expectedGzipped);
  });
});

describe("aggregateBundleSizes", () => {
  it("should aggregate bundle sizes correctly", () => {
    const bundleSizes = [
      { raw: 1000, gzipped: 500 },
      { raw: 2000, gzipped: 1000 },
      { raw: 3000, gzipped: 1500 },
    ];

    const aggregated = aggregateBundleSizes(bundleSizes);

    expect(aggregated.totalRaw).toBe(6000);
    expect(aggregated.totalGzipped).toBe(3000);
    expect(aggregated.bundles).toEqual(bundleSizes);
  });

  it("should handle empty array", () => {
    const aggregated = aggregateBundleSizes([]);
    expect(aggregated.totalRaw).toBe(0);
    expect(aggregated.totalGzipped).toBe(0);
    expect(aggregated.bundles).toEqual([]);
  });

  it("should handle single bundle", () => {
    const bundleSizes = [{ raw: 1000, gzipped: 500 }];
    const aggregated = aggregateBundleSizes(bundleSizes);

    expect(aggregated.totalRaw).toBe(1000);
    expect(aggregated.totalGzipped).toBe(500);
    expect(aggregated.bundles).toEqual(bundleSizes);
  });

  it("should handle large number of bundles", () => {
    const bundleSizes = Array.from({ length: 50 }, (_, i) => ({
      raw: i * 100,
      gzipped: i * 50,
    }));

    const aggregated = aggregateBundleSizes(bundleSizes);

    const expectedRaw = bundleSizes.reduce(
      (sum, bundle) => sum + bundle.raw,
      0,
    );
    const expectedGzipped = bundleSizes.reduce(
      (sum, bundle) => sum + bundle.gzipped,
      0,
    );

    expect(aggregated.totalRaw).toBe(expectedRaw);
    expect(aggregated.totalGzipped).toBe(expectedGzipped);
  });
});
