# Rollup Plugin API Documentation

This document describes how to integrate bundle analysis with Rollup.

## Rollup Plugin API

Rollup plugins are objects with specific hook functions.

### Plugin Structure

```typescript
import type { Plugin } from "rollup";

export function rollupBundleAnalysisPlugin(options: PluginOptions): Plugin {
  return {
    name: "rollup-bundle-analysis",
    // Plugin hooks
  };
}
```

### Key Plugin Hooks

#### `generateBundle`

**When**: Before bundles are written to disk

**Use Case**: Access bundle content and metadata

```typescript
generateBundle(options, bundle) {
  // bundle is OutputBundle
  // Process bundles before write
}
```

#### `writeBundle`

**When**: After bundles are written to disk

**Use Case**: Access final bundle files

```typescript
writeBundle(options, bundle) {
  // bundle is OutputBundle
  // Process bundles after write
}
```

#### `buildEnd`

**When**: After build completes (success or error)

**Use Case**: Final cleanup or reporting

```typescript
buildEnd(error) {
  if (error) {
    // Handle build error
  } else {
    // Build succeeded
  }
}
```

### OutputBundle Structure

```typescript
interface OutputBundle {
  [fileName: string]: OutputChunk | OutputAsset;
}

interface OutputChunk {
  type: "chunk";
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
  type: "asset";
  fileName: string;
  source: string | Uint8Array;
}
```

### Extracting Data

#### Modules

```typescript
for (const [id, chunkOrAsset] of Object.entries(bundle)) {
  if (chunkOrAsset.type === "chunk") {
    const chunk = chunkOrAsset as OutputChunk;

    if (chunk.modules) {
      for (const [moduleId, moduleInfo] of Object.entries(chunk.modules)) {
        const size = moduleInfo.renderedLength || 0;
        // Extract module data
      }
    }
  }
}
```

#### Chunks

```typescript
for (const [id, chunkOrAsset] of Object.entries(bundle)) {
  if (chunkOrAsset.type === "chunk") {
    const chunk = chunkOrAsset as OutputChunk;

    const chunkData = {
      name: chunk.name || id,
      isEntry: chunk.isEntry,
      isAsync: chunk.isDynamicEntry,
      modules: Object.keys(chunk.modules || {}),
    };
  }
}
```

#### Bundles

```typescript
for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
  if (chunkOrAsset.type === "chunk") {
    const chunk = chunkOrAsset as OutputChunk;

    const bundleData = {
      fileName,
      content: chunk.code,
      sourceMap: chunk.map,
      size: chunk.code.length,
    };
  }
}
```

### Source Map Extraction

#### Inline Source Maps

```typescript
if (chunk.map) {
  const sourceMap =
    typeof chunk.map === "string" ? chunk.map : JSON.stringify(chunk.map);
}
```

#### Separate Source Map Files

```typescript
const mapFileName = `${chunk.fileName}.map`;
const mapAsset = bundle[mapFileName];
if (mapAsset && mapAsset.type === "asset") {
  const sourceMap = mapAsset.source.toString();
}
```

### Module Resolution

Rollup provides module resolution via hooks:

#### `resolveId`

```typescript
resolveId(source, importer) {
  // Custom resolution logic
  // Return null to use default resolution
  return null;
}
```

#### `load`

```typescript
load(id) {
  // Load module content
  // Return null to use default loader
  return null;
}
```

### Rollup Configuration

#### Basic Setup

```javascript
// rollup.config.js
import { rollupBundleAnalysisPlugin } from "./rollup-plugin";

export default {
  input: "src/index.js",
  output: {
    file: "dist/bundle.js",
    format: "es",
  },
  plugins: [
    rollupBundleAnalysisPlugin({
      projectName: "my-project",
      extractSourceMaps: true,
    }),
  ],
};
```

#### With Source Maps

```javascript
export default {
  output: {
    sourcemap: true, // or 'inline' or 'hidden'
  },
  plugins: [
    rollupBundleAnalysisPlugin({
      extractSourceMaps: true,
    }),
  ],
};
```

#### With Code Splitting

```javascript
export default {
  input: {
    main: "src/index.js",
    vendor: "src/vendor.js",
  },
  output: {
    dir: "dist",
    format: "es",
    entryFileNames: "[name].js",
    chunkFileNames: "[name]-[hash].js",
  },
  plugins: [
    rollupBundleAnalysisPlugin({
      projectName: "my-project",
    }),
  ],
};
```

## Special Considerations

### Virtual Modules

Rollup uses `\0` prefix for virtual modules:

```typescript
if (moduleId.startsWith("\0")) {
  // Virtual module - handle specially or skip
}
```

### Dynamic Imports

Dynamic imports create async chunks:

```typescript
const isAsync = chunk.isDynamicEntry || chunk.dynamicImports.length > 0;
```

### Preserve Modules

When using `preserveModules: true`, each module becomes a separate file:

```typescript
output: {
  preserveModules: true,
  // Each module is now a separate bundle
}
```

### External Dependencies

External dependencies are not included in bundle:

```typescript
external: ['react', 'react-dom'],
// These won't appear in bundle.modules
```

## Plugin Context API

Access Rollup's plugin context for advanced operations:

```typescript
this.emitFile({
  type: "asset",
  fileName: "analysis.json",
  source: JSON.stringify(analysisData),
});

this.addWatchFile(filePath);
this.getModuleInfo(moduleId);
```

## Implementation Example

Since Vite uses Rollup, the Vite adapter (`src/plugins/vite/adapter.ts`) serves as a reference implementation for Rollup plugins.

## Version Compatibility

- **Rollup 4.x**: Full support (recommended)
- **Rollup 3.x**: Supported
- **Rollup 2.x**: Supported (legacy)
