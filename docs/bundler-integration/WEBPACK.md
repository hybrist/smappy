# Webpack Plugin API Documentation

This document describes how to integrate bundle analysis with Webpack.

## Webpack Plugin API

### Plugin Structure

Webpack plugins are JavaScript classes that implement the `apply` method:

```typescript
class WebpackBundleAnalysisPlugin {
  apply(compiler: webpack.Compiler) {
    // Plugin logic here
  }
}
```

### Key Compilation Hooks

#### `compilation.hooks.processAssets`

**When**: After all assets have been processed but before they're written to disk

**Use Case**: Extract bundle content, source maps, and metadata

```typescript
compiler.hooks.compilation.tap('WebpackBundleAnalysis', (compilation) => {
  compilation.hooks.processAssets.tap(
    {
      name: 'WebpackBundleAnalysis',
      stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYZE,
    },
    (assets) => {
      // Access compilation.assets for bundle files
      for (const [filename, asset] of Object.entries(assets)) {
        // Extract bundle data
      }
    },
  );
});
```

#### `compiler.hooks.done`

**When**: After compilation completes successfully

**Use Case**: Access final stats and module graph

```typescript
compiler.hooks.done.tap('WebpackBundleAnalysis', (stats) => {
  const statsJson = stats.toJson({
    all: false,
    modules: true,
    chunks: true,
    chunkModules: true,
    chunkRelations: true,
    assets: true,
  });

  // Extract data from stats
});
```

### Stats API

The Webpack Stats API provides comprehensive build information:

```typescript
interface WebpackStats {
  modules: Array<{
    identifier: string;
    name: string;
    size: number;
    reasons: Array<{
      type: string;
      module: string;
      userRequest: string;
    }>;
  }>;
  chunks: Array<{
    id: string | number;
    names: string[];
    files: string[];
    modules: Array<{
      id: string | number;
      identifier: string;
      name: string;
    }>;
    entry: boolean;
    initial: boolean;
    async: boolean;
  }>;
  assets: Array<{
    name: string;
    size: number;
    chunks: (string | number)[];
  }>;
}
```

### Module Graph API

Webpack 5+ provides a module graph for dependency analysis:

```typescript
compilation.moduleGraph.getModule(module);
compilation.moduleGraph.getOutgoingConnections(module);
compilation.moduleGraph.getIncomingConnections(module);
```

### Source Map Extraction

Source maps are available in multiple ways:

1. **From Assets**:

```typescript
const sourceMap = compilation.assets[`${filename}.map`];
```

2. **From Stats**:

```typescript
const module = stats.modules.find((m) => m.name === moduleName);
const sourceMap = module.sourceMap;
```

3. **Inline in Bundle**:

```typescript
const bundleContent = compilation.assets[filename].source();
// Extract //# sourceMappingURL=... from content
```

### Code Splitting

Webpack chunks represent code-split entry points:

```typescript
for (const chunk of compilation.chunks) {
  const isEntry = chunk.hasRuntime();
  const isAsync = !chunk.canBeInitial();
  const modules = compilation.chunkGraph.getChunkModules(chunk);
}
```

### Module Information

Extract module details:

```typescript
for (const module of compilation.modules) {
  const identifier = module.identifier();
  const size = module.size();
  const reasons = module.reasons; // Why this module was included
  const dependencies = compilation.moduleGraph.getOutgoingConnections(module);
}
```

### Implementation Example

```typescript
import type { Compiler, Compilation } from 'webpack';

export class WebpackBundleAnalysisPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('WebpackBundleAnalysis', (compilation: Compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'WebpackBundleAnalysis',
          stage: Compilation.PROCESS_ASSETS_STAGE_ANALYZE,
        },
        () => {
          const stats = compilation.getStats().toJson({
            all: false,
            modules: true,
            chunks: true,
            assets: true,
          });

          // Extract bundles
          const bundles = this.extractBundles(compilation.assets, stats);

          // Extract modules
          const modules = this.extractModules(stats, compilation);

          // Extract chunks
          const chunks = this.extractChunks(stats);

          // Process with adapter
        },
      );
    });
  }
}
```

## Webpack Configuration

### Basic Setup

```javascript
// webpack.config.js
const WebpackBundleAnalysisPlugin = require('./webpack-plugin');

module.exports = {
  plugins: [
    new WebpackBundleAnalysisPlugin({
      projectName: 'my-project',
      extractSourceMaps: true,
    }),
  ],
};
```

### With Source Maps

```javascript
module.exports = {
  devtool: 'source-map', // or 'hidden-source-map'
  plugins: [
    new WebpackBundleAnalysisPlugin({
      extractSourceMaps: true,
    }),
  ],
};
```

## Special Considerations

### Virtual Modules

Webpack uses identifiers like `webpack/runtime/...` for its runtime and internal modules, without the `\0` prefix. These modules should be filtered or handled specially if needed.

### Node Modules

Third-party modules are typically in `node_modules` paths. Use `analyzeThirdParty` option to control inclusion.

### Dynamic Imports

Dynamic imports create async chunks. Access via `chunk.canBeInitial()` or `chunk.isOnlyInitial()`.

### CSS Modules

CSS files are assets, not modules. Handle separately if CSS analysis is needed.

## Version Compatibility

- **Webpack 5.x**: Full support (recommended)
- **Webpack 4.x**: Limited support (legacy stats format)
