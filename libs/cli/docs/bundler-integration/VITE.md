# Vite Plugin API Documentation

This document describes how to integrate bundle analysis with Vite.

## Vite Plugin API

Vite plugins are based on Rollup's plugin API with additional Vite-specific hooks.

### Plugin Structure

```typescript
import type { Plugin } from 'vite';

export function viteBundleAnalysisPlugin(options: VitePluginOptions): Plugin {
  return {
    name: 'vite-bundle-analysis',
    enforce: 'post', // Run after other plugins
    // Plugin hooks
  };
}
```

### Key Plugin Hooks

#### `configResolved`

**When**: After Vite config is resolved

**Use Case**: Capture root directory and output directory

```typescript
configResolved(resolvedConfig) {
  rootDir = resolvedConfig.root;
  outputDir = resolvedConfig.build.outDir || 'dist';
}
```

#### `writeBundle`

**When**: After bundle files are written to disk

**Use Case**: Extract bundle data from output

```typescript
async writeBundle(options, bundle) {
  // bundle is Rollup's OutputBundle
  // Process bundles here
}
```

#### `generateBundle`

**When**: Before bundles are written (alternative to `writeBundle`)

**Use Case**: Access bundle content before disk write

```typescript
generateBundle(options, bundle) {
  // bundle is Rollup's OutputBundle
  // Access bundle.code, bundle.map, etc.
}
```

### Rollup OutputBundle Structure

Vite uses Rollup's `OutputBundle` type:

```typescript
interface OutputBundle {
  [fileName: string]: OutputChunk | OutputAsset;
}

interface OutputChunk {
  type: 'chunk';
  fileName: string;
  name?: string;
  isEntry: boolean;
  isDynamicEntry: boolean;
  code: string;
  map?: SourceMap | string;
  modules: {
    [id: string]: {
      renderedLength?: number;
    };
  };
  imports: string[];
  dynamicImports: string[];
  facadeModuleId?: string;
}

interface OutputAsset {
  type: 'asset';
  fileName: string;
  source: string | Uint8Array;
}
```

### Extracting Modules

Modules are embedded within chunks:

```typescript
for (const [id, chunkOrAsset] of Object.entries(bundle)) {
  if (chunkOrAsset.type === 'chunk') {
    const chunk = chunkOrAsset as OutputChunk;

    // Access modules in chunk
    if (chunk.modules) {
      for (const [moduleId, moduleInfo] of Object.entries(chunk.modules)) {
        // moduleId: module identifier
        // moduleInfo.renderedLength: size in bytes
      }
    }
  }
}
```

### Extracting Chunks

Chunks represent code-split entry points:

```typescript
for (const [id, chunkOrAsset] of Object.entries(bundle)) {
  if (chunkOrAsset.type === 'chunk') {
    const chunk = chunkOrAsset as OutputChunk;

    const isEntry = chunk.isEntry;
    const isAsync = chunk.isDynamicEntry;
    const moduleIds = Object.keys(chunk.modules || {});
  }
}
```

### Extracting Bundles

Bundles are the output files:

```typescript
for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
  if (chunkOrAsset.type === 'chunk') {
    const chunk = chunkOrAsset as OutputChunk;

    const content = chunk.code;
    const sourceMap = chunk.map; // Inline source map
    const size = content.length;
  }
}
```

### Source Map Extraction

Source maps are available inline in chunks:

```typescript
if (chunk.map) {
  const sourceMap =
    typeof chunk.map === 'string' ? chunk.map : JSON.stringify(chunk.map);
}
```

Or from separate `.map` files:

```typescript
const mapFileName = `${chunk.fileName}.map`;
const mapAsset = bundle[mapFileName];
if (mapAsset && mapAsset.type === 'asset') {
  const sourceMap = mapAsset.source.toString();
}
```

### SSR Builds

Vite handles SSR as a separate build. Detect SSR builds:

```typescript
writeBundle(options, bundle) {
  // options.format can be 'es' (client) or 'cjs' (SSR)
  // Or check for SSR-specific output directory
  const isSSR = options.format === 'cjs' || options.dir?.includes('server');
}
```

### Vite Configuration

#### Basic Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { viteBundleAnalysisPlugin } from './vite-plugin';

export default defineConfig({
  plugins: [
    viteBundleAnalysisPlugin({
      projectName: 'my-project',
      extractSourceMaps: true,
    }),
  ],
});
```

#### With Source Maps

```typescript
export default defineConfig({
  build: {
    sourcemap: true, // or 'inline' or 'hidden'
  },
  plugins: [
    viteBundleAnalysisPlugin({
      extractSourceMaps: true,
    }),
  ],
});
```

#### With Custom Output Directory

```typescript
export default defineConfig({
  build: {
    outDir: 'build',
  },
  plugins: [
    viteBundleAnalysisPlugin({
      buildOutputDir: 'build',
    }),
  ],
});
```

## Rollup Plugin API (Vite Base)

Since Vite is built on Rollup, Rollup plugins work in Vite:

### Rollup Plugin Hooks

- `buildStart`: Build begins
- `resolveId`: Module resolution
- `load`: Load module content
- `transform`: Transform module
- `buildEnd`: Build completes
- `generateBundle`: Before writing bundles
- `writeBundle`: After writing bundles

### Rollup Context

Access Rollup's plugin context:

```typescript
this.emitFile({
  type: 'asset',
  fileName: 'analysis.json',
  source: JSON.stringify(analysisData),
});
```

## Special Considerations

### Virtual Modules

Rollup uses `\0` prefix for virtual modules. Filter these:

```typescript
if (moduleId.startsWith('\0')) {
  continue; // Skip virtual modules
}
```

### Node Modules

Third-party modules identified by path:

```typescript
if (moduleId.includes('node_modules') && !options.analyzeThirdParty) {
  continue; // Skip unless configured
}
```

### Dynamic Imports

Dynamic imports create async chunks:

```typescript
const isAsync = chunk.isDynamicEntry || chunk.dynamicImports.length > 0;
```

### CSS and Assets

CSS files are assets, not chunks:

```typescript
if (chunkOrAsset.type === 'asset') {
  const asset = chunkOrAsset as OutputAsset;
  // Handle CSS, images, etc.
}
```

## Implementation Example

See `src/plugins/vite/plugin.ts` and `src/plugins/vite/adapter.ts` for the complete implementation.

## Version Compatibility

- **Vite 5.x**: Full support (recommended)
- **Vite 4.x**: Supported
- **Vite 3.x**: Supported (legacy)
