/**
 * Tests for framework detection
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectFramework } from './framework.ts';

describe('Framework Detection', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `framework-detection-test-${Date.now()}`);
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

      const result = detectFramework(testDir, {});
      expect(result.framework).toBe('nextjs');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('next.config.js');
    });

    it('should detect Next.js via next dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { next: '^15.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { next: '^15.0.0' },
      });
      expect(result.framework).toBe('nextjs');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('next in dependencies');
    });
  });

  describe('SvelteKit detection', () => {
    it('should detect SvelteKit via svelte.config.js with @sveltejs/kit', () => {
      writeFileSync(join(testDir, 'svelte.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { '@sveltejs/kit': '^2.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { '@sveltejs/kit': '^2.0.0' },
      });
      expect(result.framework).toBe('sveltekit');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('svelte.config.js');
      expect(result.detectedVia).toContain('@sveltejs/kit in dependencies');
    });

    it('should detect SvelteKit via @sveltejs/kit dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { '@sveltejs/kit': '^2.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { '@sveltejs/kit': '^2.0.0' },
      });
      expect(result.framework).toBe('sveltekit');
      expect(result.confidence).toBe('high');
    });

    it('should detect Svelte (not SvelteKit) if svelte.config exists but no kit', () => {
      writeFileSync(join(testDir, 'svelte.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { svelte: '^5.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { svelte: '^5.0.0' },
      });
      expect(result.framework).toBe('svelte');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Nuxt detection', () => {
    it('should detect Nuxt via nuxt.config.js', () => {
      writeFileSync(join(testDir, 'nuxt.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectFramework(testDir, {});
      expect(result.framework).toBe('nuxt');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('nuxt.config.js');
    });

    it('should detect Nuxt via nuxt.config.ts', () => {
      writeFileSync(join(testDir, 'nuxt.config.ts'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectFramework(testDir, {});
      expect(result.framework).toBe('nuxt');
      expect(result.confidence).toBe('medium');
    });

    it('should detect Nuxt via nuxt dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { nuxt: '^3.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { nuxt: '^3.0.0' },
      });
      expect(result.framework).toBe('nuxt');
      expect(result.confidence).toBe('high');
    });
  });

  describe('Angular detection', () => {
    it('should detect Angular via angular.json', () => {
      writeFileSync(join(testDir, 'angular.json'), '{}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectFramework(testDir, {});
      expect(result.framework).toBe('angular');
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

      const result = detectFramework(testDir, {
        dependencies: { '@angular/core': '^17.0.0' },
      });
      expect(result.framework).toBe('angular');
      expect(result.confidence).toBe('high');
    });
  });

  describe('React detection', () => {
    it('should detect React via react and react-dom dependencies', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
      });
      expect(result.framework).toBe('react');
      expect(result.confidence).toBe('high');
      expect(result.detectedVia).toContain('react/react-dom in dependencies');
    });

    it('should detect React via react dependency only', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { react: '^18.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { react: '^18.0.0' },
      });
      expect(result.framework).toBe('react');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('react in dependencies');
    });
  });

  describe('Vue detection', () => {
    it('should detect Vue via vue dependency', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { vue: '^3.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { vue: '^3.0.0' },
      });
      expect(result.framework).toBe('vue');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('vue in dependencies');
    });
  });

  describe('Svelte (standalone) detection', () => {
    it('should detect standalone Svelte via svelte dependency (without svelte.config)', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { svelte: '^5.0.0' },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: { svelte: '^5.0.0' },
      });
      expect(result.framework).toBe('svelte');
      expect(result.confidence).toBe('medium');
      expect(result.detectedVia).toContain('svelte in dependencies');
    });
  });

  describe('No framework detected', () => {
    it('should return null when no framework is detected', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = detectFramework(testDir, {});
      expect(result.framework).toBeNull();
      expect(result.confidence).toBe('low');
    });
  });

  describe('Priority order', () => {
    it('should prioritize Next.js over React', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: {
            next: '^15.0.0',
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: {
          next: '^15.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
      });
      expect(result.framework).toBe('nextjs');
    });

    it('should prioritize SvelteKit over Svelte', () => {
      writeFileSync(join(testDir, 'svelte.config.js'), 'export default {}');
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: {
            '@sveltejs/kit': '^2.0.0',
            svelte: '^5.0.0',
          },
        }),
      );

      const result = detectFramework(testDir, {
        dependencies: {
          '@sveltejs/kit': '^2.0.0',
          svelte: '^5.0.0',
        },
      });
      expect(result.framework).toBe('sveltekit');
    });
  });
});
