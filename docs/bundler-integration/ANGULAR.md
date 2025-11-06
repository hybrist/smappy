# Angular CLI Builder API Documentation

This document describes how to integrate bundle analysis with Angular CLI using a custom builder.

## Angular Builder API

Angular builders are Node.js packages that implement the `Builder` interface.

### Builder Structure

```typescript
import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';

interface BuilderOptions extends json.JsonObject {
  projectName: string;
  extractSourceMaps?: boolean;
  // ... other options
}

export default async function build(
  options: BuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  // Builder implementation
}
```

### Builder Interface

```typescript
interface Builder {
  run(builderConfig: BuilderConfiguration): Observable<BuilderOutput>;
}
```

### Builder Context

The `BuilderContext` provides access to:

- `target`: Build target configuration
- `workspaceRoot`: Project root directory
- `logger`: Logging interface
- `scheduleTarget()`: Schedule other targets
- `getBuilderNameForTarget()`: Get builder name

### Build Execution

Angular CLI executes builders via the Architect API:

```typescript
export default async function build(
  options: BuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const { projectName, extractSourceMaps } = options;

  // Schedule the application builder
  const applicationBuilder = await context.scheduleTarget({
    target: 'build',
    project: context.target.project,
  });

  // Wait for build to complete
  const result = await applicationBuilder.result;

  if (result.success) {
    // Extract bundle data from build output
    const outputPath = result.outputPath || 'dist';
    // Process bundles...
  }

  return { success: result.success };
}
```

## Angular Application Builder (esbuild-based)

Angular 17+ uses a new application builder based on esbuild and Rollup.

### Stats JSON Output

The application builder supports `--stats-json` flag:

```bash
ng build --stats-json
```

This generates a `stats.json` file with build information.

### Stats JSON Structure

```typescript
interface AngularStats {
  chunks: Array<{
    id: string;
    names: string[];
    files: string[];
    entry: boolean;
    initial: boolean;
    async: boolean;
    modules: Array<{
      id: string;
      identifier: string;
      name: string;
      size: number;
    }>;
  }>;
  modules: Array<{
    identifier: string;
    name: string;
    size: number;
    chunks: string[];
  }>;
  assets: Array<{
    name: string;
    size: number;
    chunks: string[];
  }>;
}
```

### Extracting Bundle Data

#### From Stats JSON

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const statsPath = join(outputPath, 'stats.json');
const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));

// Extract modules
const modules = stats.modules.map((module) => ({
  identifier: module.identifier,
  name: module.name,
  size: module.size,
}));

// Extract chunks
const chunks = stats.chunks.map((chunk) => ({
  name: chunk.names[0] || chunk.id,
  isEntry: chunk.entry || chunk.initial,
  isAsync: chunk.async,
  moduleIds: chunk.modules.map((m) => m.id),
}));

// Extract bundles
const bundles = stats.assets
  .filter((asset) => asset.name.endsWith('.js'))
  .map((asset) => ({
    fileName: asset.name,
    size: asset.size,
  }));
```

#### From Build Output Directory

```typescript
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function extractBundles(outputPath: string) {
  const bundles = [];
  const files = readdirSync(outputPath, { recursive: true });

  for (const file of files) {
    const filePath = join(outputPath, file);
    const stats = statSync(filePath);

    if (file.endsWith('.js') && stats.isFile()) {
      const content = readFileSync(filePath, 'utf-8');
      bundles.push({
        fileName: file,
        content,
        size: stats.size,
      });
    }
  }

  return bundles;
}
```

### Lazy Loading and Routes

Angular uses route-based code splitting:

```typescript
// angular.json
{
  "routes": {
    "lazy": "./lazy.module.ts"
  }
}
```

Lazy routes create separate chunks:

```typescript
const lazyChunks = stats.chunks.filter((chunk) =>
  chunk.names.some((name) => name.includes('lazy')),
);
```

### Angular Configuration

#### angular.json Setup

```json
{
  "projects": {
    "my-app": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/my-app",
            "statsJson": true
          }
        },
        "analyze": {
          "builder": "./dist/angular-builder",
          "options": {
            "projectName": "my-app",
            "extractSourceMaps": true
          }
        }
      }
    }
  }
}
```

#### Running the Builder

```bash
ng run my-app:analyze
```

Or combine with build:

```json
{
  "analyze": {
    "builder": "./dist/angular-builder",
    "options": {
      "projectName": "my-app"
    },
    "dependsOn": ["build"]
  }
}
```

## Source Map Extraction

### From Build Output

```typescript
function extractSourceMaps(outputPath: string) {
  const sourceMaps = new Map();
  const files = readdirSync(outputPath, { recursive: true });

  for (const file of files) {
    if (file.endsWith('.map')) {
      const mapPath = join(outputPath, file);
      const mapContent = readFileSync(mapPath, 'utf-8');
      const bundleName = file.replace('.map', '');
      sourceMaps.set(bundleName, mapContent);
    }
  }

  return sourceMaps;
}
```

### From Inline Source Maps

```typescript
function extractInlineSourceMap(bundleContent: string) {
  const sourceMapMatch = bundleContent.match(
    /\/\/# sourceMappingURL=data:application\/json;base64,(.+)$/m,
  );

  if (sourceMapMatch) {
    return Buffer.from(sourceMapMatch[1], 'base64').toString('utf-8');
  }

  return null;
}
```

## Special Considerations

### Application Builder Only

**Important**: Only support the new application builder (`@angular-devkit/build-angular:application`), not the legacy browser builder (`@angular-devkit/build-angular:browser`).

The browser builder uses webpack and is deprecated. The application builder uses esbuild and Rollup.

### Angular Modules vs ES Modules

Angular modules (`@NgModule`) are different from ES modules. The builder should focus on the final bundle output, not Angular's module system.

### SSR Builds

Angular supports SSR builds. Handle separately:

```typescript
const ssrOutputPath = join(outputPath, 'server');
const browserOutputPath = join(outputPath, 'browser');

// Process both separately
```

### Build Optimizations

Angular applies various optimizations:

- Tree shaking
- Minification
- Code splitting
- AOT compilation

These affect bundle structure but don't require special handling in the builder.

## Implementation Example

```typescript
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface BuilderOptions extends json.JsonObject {
  projectName: string;
  extractSourceMaps?: boolean;
}

export default createBuilder(
  async (options: BuilderOptions, context: BuilderContext): Promise<BuilderOutput> => {
    // Schedule application build
    const buildTarget = await context.scheduleTarget({
      target: 'build',
      project: context.target.project,
    });

    const result = await buildTarget.result;

    if (!result.success) {
      return { success: false };
    }

    const outputPath = result.outputPath || 'dist';

    // Extract bundle data
    const statsPath = join(outputPath, 'stats.json');
    const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));

    // Process with adapter
    // ...

    return { success: true };
  },
);
```

## Version Compatibility

- **Angular 20+**: Full support (application builder)
- **Angular 17-19**: Supported (application builder)
- **Angular 16 and below**: Not supported (uses browser builder/webpack)
