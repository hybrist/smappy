/**
 * Tests for bundler detection
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectBundler } from './bundler.ts';

describe('Bundler Detection', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `bundler-detection-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Next.js detection', () => {
    it('should detect Next.js via next.config.js', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('nextjs');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('next.config.js');
    });

    it('should detect Next.js via next.config.ts', () => {
      writeFileSync(join(testDir, 'next.config.ts'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('nextjs');
      expect(result.confidence).toBe('high');
    });

    it('should detect Next.js via next dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { next: '^15.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        dependencies: { next: '^15.0.0' },
      });
      expect(result.bundler).toBe('nextjs');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('next in dependencies');
    });
  });

  describe('Angular detection', () => {
    it('should detect Angular via angular.json', () => {
      writeFileSync(join(testDir, 'angular.json'), '{}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('angular');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('angular.json');
    });

    it('should detect Angular via @angular/core dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { '@angular/core': '^17.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        dependencies: { '@angular/core': '^17.0.0' },
      });
      expect(result.bundler).toBe('angular');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('@angular/core in dependencies');
    });
  });

  describe('Vite detection', () => {
    it('should detect Vite via vite.config.js', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('vite');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('vite.config.js');
    });

    it('should detect Vite via vite.config.ts', () => {
      writeFileSync(join(testDir, 'vite.config.ts'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('vite');
      expect(result.confidence).toBe('medium');
    });

    it('should detect Vite via vite dependency with high confidence', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { vite: '^7.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { vite: '^7.0.0' },
      });
      expect(result.bundler).toBe('vite');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('vite in dependencies');
    });

    it('should detect Vite via config file and dependency with high confidence', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { vite: '^7.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { vite: '^7.0.0' },
      });
      expect(result.bundler).toBe('vite');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia.length).toBeGreaterThan(1);
    });
  });

  describe('Webpack detection', () => {
    it('should detect Webpack via webpack.config.js', () => {
      writeFileSync(join(testDir, 'webpack.config.js'), 'module.exports = {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('webpack');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('webpack.config.js');
    });

    it('should detect Webpack via webpack.config.ts', () => {
      writeFileSync(join(testDir, 'webpack.config.ts'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBe('webpack');
      expect(result.confidence).toBe('medium');
    });

    it('should detect Webpack via webpack dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { webpack: '^5.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { webpack: '^5.0.0' },
      });
      expect(result.bundler).toBe('webpack');
      expect(result.confidence).toBe('high');
    });

    it('should detect Webpack via webpack-cli dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { 'webpack-cli': '^5.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { 'webpack-cli': '^5.0.0' },
      });
      expect(result.bundler).toBe('webpack');
      expect(result.confidence).toBe('high');
    });
  });

  describe('Other bundlers', () => {
    it('should detect Rollup via dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { rollup: '^4.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { rollup: '^4.0.0' },
      });
      expect(result.bundler).toBe('rollup');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('rollup in dependencies');
    });

    it('should detect esbuild via dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { esbuild: '^0.20.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { esbuild: '^0.20.0' },
      });
      expect(result.bundler).toBe('esbuild');
      expect(result.confidence).toBe('medium');
    });

    it('should detect Parcel via dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { parcel: '^2.12.0' },
        }),
      );

      const result = detectBundler(testDir, {
        devDependencies: { parcel: '^2.12.0' },
      });
      expect(result.bundler).toBe('parcel');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('No bundler detected', () => {
    it('should return null when no bundler is detected', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectBundler(testDir, {});
      expect(result.bundler).toBeNull();
      expect(result.confidence).toBe('low');
    });
  });

  describe('Priority order', () => {
    it('should prioritize Next.js over Vite', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(join(testDir, 'vite.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { next: '^15.0.0' },
          devDependencies: { vite: '^7.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        dependencies: { next: '^15.0.0' },
        devDependencies: { vite: '^7.0.0' },
      });
      expect(result.bundler).toBe('nextjs');
    });

    it('should prioritize Angular over Webpack', () => {
      writeFileSync(join(testDir, 'angular.json'), '{}');
      writeFileSync(join(testDir, 'webpack.config.js'), 'module.exports = {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { '@angular/core': '^17.0.0' },
          devDependencies: { webpack: '^5.0.0' },
        }),
      );

      const result = detectBundler(testDir, {
        dependencies: { '@angular/core': '^17.0.0' },
        devDependencies: { webpack: '^5.0.0' },
      });
      expect(result.bundler).toBe('angular');
    });
  });
});
