/**
 * Tests for dependency graph builder
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildDependencyGraph,
  resolveModule,
  findCircularDependencies,
  isThirdPartyModule,
  extractPackageName,
  getPackageMetadata,
  type BuilderOptions,
} from './builder.js';
import type { ParsedDependency } from '../types/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('buildDependencyGraph', () => {
  let tempDir: string;
  let options: BuilderOptions;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = join(tmpdir(), `builder-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Setup test package.json
    const packageJson = {
      name: 'test-project',
      dependencies: {
        react: '^18.0.0',
        '@testing-library/react': '^14.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    options = {
      baseDir: tempDir,
      packageJsonPaths: [join(tempDir, 'package.json')],
    };

    return () => {
      // Cleanup
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  describe('Static Imports', () => {
    it('should parse named imports', () => {
      const code = `import { useState, useEffect } from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        source: join(tempDir, 'src/App.tsx'),
        target: 'react',
        type: 'import',
        importedNames: ['useState', 'useEffect'],
        isDefault: false,
        isNamespace: false,
      });
    });

    it('should parse default imports', () => {
      const code = `import React from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: 'react',
        type: 'import',
        importedNames: ['default'],
        isDefault: true,
      });
    });

    it('should parse namespace imports', () => {
      const code = `import * as React from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: 'react',
        type: 'import',
        importedNames: ['*'],
        isNamespace: true,
      });
    });

    it('should parse mixed imports', () => {
      const code = `import React, { useState } from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: 'react',
        type: 'import',
        importedNames: ['default', 'useState'],
        isDefault: true,
      });
    });

    it('should parse side-effect imports', () => {
      const code = `import './styles.css';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: './styles.css',
        type: 'import',
      });
    });

    it('should parse relative imports', () => {
      const code = `
				import { helper } from './utils';
				import { Component } from '../components/Component';
			`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0].target).toBe('./utils');
      expect(result.dependencies[1].target).toBe('../components/Component');
    });
  });

  describe('Dynamic Imports', () => {
    it('should parse dynamic imports', () => {
      const code = `const module = await import('lodash');`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: 'lodash',
        type: 'dynamic-import',
      });
    });

    it('should parse dynamic imports with relative paths', () => {
      const code = `const module = await import('./utils');`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: './utils',
        type: 'dynamic-import',
      });
    });

    it('should skip dynamic imports if disabled', () => {
      const code = `const module = await import('lodash');`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), {
        ...options,
        followDynamicImports: false,
      });

      expect(result.dependencies).toHaveLength(0);
    });

    it('should skip dynamic imports with non-string literals', () => {
      const code = `
				const path = 'lodash';
				const module = await import(path);
			`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(0);
    });
  });

  describe('Export Declarations', () => {
    it('should parse re-exports', () => {
      const code = `export { useState, useEffect } from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/index.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: 'react',
        type: 're-export',
        importedNames: ['useState', 'useEffect'],
      });
    });

    it('should parse export all', () => {
      const code = `export * from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/index.tsx'), options);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toMatchObject({
        target: 'react',
        type: 're-export',
        isNamespace: true,
      });
    });

    it('should skip exports without source', () => {
      const code = `export const foo = 'bar';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(0);
    });
  });

  describe('Location Tracking', () => {
    it('should track import locations', () => {
      const code = `import React from 'react';`;
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies[0].location).toBeDefined();
      expect(result.dependencies[0].location?.start).toMatchObject({
        line: 1,
        column: 0,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid syntax gracefully', () => {
      const code = `import { from 'react'`; // Invalid syntax
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(0);
      expect(result.modules.size).toBe(0);
    });

    it('should handle empty code', () => {
      const code = '';
      const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

      expect(result.dependencies).toHaveLength(0);
    });
  });
});

describe('resolveModule', () => {
  let tempDir: string;
  let options: BuilderOptions;

  beforeEach(() => {
    tempDir = join(tmpdir(), `resolver-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const packageJson = {
      name: 'test-project',
      dependencies: {
        react: '^18.0.0',
      },
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    options = {
      baseDir: tempDir,
      packageJsonPaths: [join(tempDir, 'package.json')],
    };

    return () => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  describe('Relative Paths', () => {
    it('should resolve relative paths', () => {
      const fromFile = join(tempDir, 'src/components/App.tsx');
      const result = resolveModule('./Button', fromFile, options);

      expect(result).toMatchObject({
        originalPath: './Button',
        resolvedPath: join(tempDir, 'src/components/Button'),
        isThirdParty: false,
      });
    });

    it('should resolve parent directory paths', () => {
      const fromFile = join(tempDir, 'src/components/App.tsx');
      const result = resolveModule('../utils/helper', fromFile, options);

      expect(result).toMatchObject({
        originalPath: '../utils/helper',
        resolvedPath: join(tempDir, 'src/utils/helper'),
        isThirdParty: false,
      });
    });
  });

  describe('Absolute Paths', () => {
    it('should handle absolute paths', () => {
      const fromFile = join(tempDir, 'src/App.tsx');
      const absolutePath = '/usr/local/lib/module';
      const result = resolveModule(absolutePath, fromFile, options);

      expect(result).toMatchObject({
        originalPath: absolutePath,
        resolvedPath: absolutePath,
        isThirdParty: false,
      });
    });
  });

  describe('Aliased Paths', () => {
    it('should resolve aliased paths', () => {
      const optionsWithAliases: BuilderOptions = {
        ...options,
        aliases: {
          '@': './src',
          '~': './lib',
        },
      };

      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('@/components/Button', fromFile, optionsWithAliases);

      expect(result).toMatchObject({
        originalPath: '@/components/Button',
        isThirdParty: false,
      });
      expect(result.resolvedPath).toContain('src/components/Button');
    });

    it('should resolve multiple aliases', () => {
      const optionsWithAliases: BuilderOptions = {
        ...options,
        aliases: {
          '@components': './src/components',
          '@utils': './src/utils',
        },
      };

      const fromFile = join(tempDir, 'src/App.tsx');
      const result1 = resolveModule('@components/Button', fromFile, optionsWithAliases);
      const result2 = resolveModule('@utils/helper', fromFile, optionsWithAliases);

      expect(result1.resolvedPath).toContain('src/components/Button');
      expect(result2.resolvedPath).toContain('src/utils/helper');
    });
  });

  describe('Third-Party Modules', () => {
    it('should detect regular third-party modules', () => {
      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('react', fromFile, options);

      expect(result).toMatchObject({
        originalPath: 'react',
        resolvedPath: 'react',
        isThirdParty: true,
        packageName: 'react',
        packageVersion: '18.0.0',
      });
    });

    it('should detect scoped packages', () => {
      const packageJson = {
        dependencies: {
          '@testing-library/react': '^14.0.0',
        },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('@testing-library/react', fromFile, options);

      expect(result).toMatchObject({
        originalPath: '@testing-library/react',
        resolvedPath: '@testing-library/react',
        isThirdParty: true,
        packageName: '@testing-library/react',
        packageVersion: '14.0.0',
      });
    });

    it('should handle subpath imports', () => {
      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('lodash/debounce', fromFile, options);

      expect(result).toMatchObject({
        isThirdParty: true,
        packageName: 'lodash',
      });
    });

    it('should handle scoped package subpaths', () => {
      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('@babel/parser/lib/index', fromFile, options);

      expect(result).toMatchObject({
        isThirdParty: true,
        packageName: '@babel/parser',
      });
    });
  });

  describe('Package Metadata', () => {
    it('should extract version from dependencies', () => {
      const packageJson = {
        dependencies: { react: '^18.2.0' },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('react', fromFile, options);

      expect(result.packageVersion).toBe('18.2.0');
    });

    it('should extract version from devDependencies', () => {
      const packageJson = {
        devDependencies: { typescript: '^5.0.0' },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('typescript', fromFile, options);

      expect(result.packageVersion).toBe('5.0.0');
    });

    it('should handle missing package.json', () => {
      const optionsWithoutPkg: BuilderOptions = {
        baseDir: tempDir,
        packageJsonPaths: [],
      };

      const fromFile = join(tempDir, 'src/App.tsx');
      const result = resolveModule('react', fromFile, optionsWithoutPkg);

      expect(result).toMatchObject({
        isThirdParty: true,
        packageName: 'react',
        packageVersion: undefined,
      });
    });
  });
});

describe('findCircularDependencies', () => {
  it('should detect simple circular dependencies', () => {
    const dependencies: ParsedDependency[] = [
      {
        source: 'A',
        target: 'B',
        type: 'import',
      },
      {
        source: 'B',
        target: 'A',
        type: 'import',
      },
    ];

    const cycles = findCircularDependencies(dependencies);

    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain('A');
    expect(cycles[0]).toContain('B');
  });

  it('should detect complex circular dependencies', () => {
    const dependencies: ParsedDependency[] = [
      { source: 'A', target: 'B', type: 'import' },
      { source: 'B', target: 'C', type: 'import' },
      { source: 'C', target: 'A', type: 'import' },
    ];

    const cycles = findCircularDependencies(dependencies);

    expect(cycles.length).toBeGreaterThan(0);
    const cycle = cycles[0];
    expect(cycle).toContain('A');
    expect(cycle).toContain('B');
    expect(cycle).toContain('C');
  });

  it('should handle no circular dependencies', () => {
    const dependencies: ParsedDependency[] = [
      { source: 'A', target: 'B', type: 'import' },
      { source: 'B', target: 'C', type: 'import' },
      { source: 'C', target: 'D', type: 'import' },
    ];

    const cycles = findCircularDependencies(dependencies);

    expect(cycles).toHaveLength(0);
  });

  it('should handle self-referencing modules', () => {
    const dependencies: ParsedDependency[] = [
      {
        source: 'A',
        target: 'A',
        type: 'import',
      },
    ];

    const cycles = findCircularDependencies(dependencies);

    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should handle empty dependency list', () => {
    const cycles = findCircularDependencies([]);

    expect(cycles).toHaveLength(0);
  });
});

describe('isThirdPartyModule', () => {
  it('should identify third-party modules', () => {
    expect(isThirdPartyModule('react')).toBe(true);
    expect(isThirdPartyModule('lodash')).toBe(true);
    expect(isThirdPartyModule('@babel/parser')).toBe(true);
  });

  it('should identify first-party modules', () => {
    expect(isThirdPartyModule('./utils')).toBe(false);
    expect(isThirdPartyModule('../components/Button')).toBe(false);
    expect(isThirdPartyModule('/absolute/path')).toBe(false);
  });
});

describe('extractPackageName', () => {
  it('should extract regular package names', () => {
    expect(extractPackageName('react')).toBe('react');
    expect(extractPackageName('lodash/debounce')).toBe('lodash');
  });

  it('should extract scoped package names', () => {
    expect(extractPackageName('@babel/parser')).toBe('@babel/parser');
    expect(extractPackageName('@testing-library/react')).toBe('@testing-library/react');
    expect(extractPackageName('@babel/parser/lib/index')).toBe('@babel/parser');
  });

  it('should return null for first-party modules', () => {
    expect(extractPackageName('./utils')).toBeNull();
    expect(extractPackageName('../components')).toBeNull();
  });
});

describe('getPackageMetadata', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `metadata-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    return () => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  it('should get metadata from dependencies', () => {
    const packageJson = {
      dependencies: { react: '^18.0.0' },
    };
    const pkgPath = join(tempDir, 'package.json');
    writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2));

    const metadata = getPackageMetadata('react', [pkgPath]);

    expect(metadata).toMatchObject({
      version: '18.0.0',
      resolved: true,
    });
  });

  it('should get metadata from devDependencies', () => {
    const packageJson = {
      devDependencies: { typescript: '^5.0.0' },
    };
    const pkgPath = join(tempDir, 'package.json');
    writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2));

    const metadata = getPackageMetadata('typescript', [pkgPath]);

    expect(metadata).toMatchObject({
      version: '5.0.0',
      resolved: true,
    });
  });

  it('should handle missing packages', () => {
    const packageJson = {
      dependencies: {},
    };
    const pkgPath = join(tempDir, 'package.json');
    writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2));

    const metadata = getPackageMetadata('unknown', [pkgPath]);

    expect(metadata).toMatchObject({
      resolved: false,
    });
  });

  it('should handle invalid package.json', () => {
    const pkgPath = join(tempDir, 'package.json');
    writeFileSync(pkgPath, 'invalid json');

    const metadata = getPackageMetadata('react', [pkgPath]);

    expect(metadata).toMatchObject({
      resolved: false,
    });
  });
});

describe('Integration Tests', () => {
  let tempDir: string;
  let options: BuilderOptions;

  beforeEach(() => {
    tempDir = join(tmpdir(), `integration-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const packageJson = {
      dependencies: {
        react: '^18.0.0',
        lodash: '^4.17.21',
      },
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    options = {
      baseDir: tempDir,
      packageJsonPaths: [join(tempDir, 'package.json')],
    };

    return () => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  it('should handle complex real-world code', () => {
    const code = `
			import React, { useState, useEffect } from 'react';
			import { debounce } from 'lodash';
			import { Button } from './components/Button';
			import * as utils from '../utils';

			export { Header } from './components/Header';
			export * from './components/Footer';

			const LazyComponent = () => import('./LazyComponent');
		`;

    const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

    // Should parse all imports and exports
    expect(result.dependencies.length).toBeGreaterThan(0);

    // Should resolve third-party modules
    const reactModule = Array.from(result.modules.values()).find((m) => m.packageName === 'react');
    expect(reactModule).toBeDefined();
    expect(reactModule?.isThirdParty).toBe(true);
    expect(reactModule?.packageVersion).toBe('18.0.0');
  });

  it('should provide comprehensive module information', () => {
    const code = `
			import React from 'react';
			import { Button } from './Button';
		`;

    const result = buildDependencyGraph(code, join(tempDir, 'src/App.tsx'), options);

    expect(result).toHaveProperty('dependencies');
    expect(result).toHaveProperty('modules');
    expect(result).toHaveProperty('circularDependencies');

    expect(result.dependencies).toHaveLength(2);
    expect(result.modules.size).toBeGreaterThan(0);
  });
});
