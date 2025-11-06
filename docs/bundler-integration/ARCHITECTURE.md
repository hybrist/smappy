# Bundler Integration Architecture

This document outlines the architecture for integrating bundle analysis with various JavaScript bundlers.

## Overview

The bundle analysis system uses a plugin-based architecture that normalizes bundler-specific output into a common format (`BundleInput`, `ModuleInput`, `ChunkInput`) that can be ingested into the analysis system.

## Core Architecture

### Plugin Interface

All bundler plugins implement the `BundlerPlugin` interface:

```typescript
interface BundlerPlugin {
  readonly bundlerName: string;
  readonly bundlerVersion?: string;

  extract(
    bundlerOutput: unknown,
    options: BundlerPluginOptions,
    config?: PluginConfig,
  ): PluginExtractionResult | Promise<PluginExtractionResult>;
}
```

### Adapter Pattern

Each bundler uses an adapter that extends `BundlerAdapter` to:

1. Extract bundler-specific data structures
2. Convert to normalized `BundlerModule`, `BundlerChunk`, `BundlerBundle` types
3. Transform to final `ModuleInput`, `ChunkInput`, `BundleInput` for ingestion

### Data Flow

```
Bundler Build Output
    ↓
Bundler Plugin Hook
    ↓
Adapter.extract() → Normalized Bundler Types
    ↓
Adapter.convert*() → Ingestion Input Types
    ↓
ingestBundle() → Database
```

## Mapping Bundler Output to Ingestion Input

### Modules

**Source**: Individual source files (`.js`, `.ts`, `.jsx`, `.tsx`, etc.)

**Mapping**:

- `identifier`/`name` → `ModuleInput.filePath`
- `source` → `ModuleInput.sourceContent`
- `size` → Used for size calculations
- `dependencies` → Used for dependency graph

### Chunks

**Source**: Code-split entry points or logical groupings

**Mapping**:

- `name` → `ChunkInput.name`
- `isEntry` → `ChunkInput.isEntry`
- `isAsync` → `ChunkInput.isAsync`
- `modules` → `ChunkInput.moduleIds`

### Bundles

**Source**: Final output files written to disk

**Mapping**:

- `fileName` → `BundleInput.fileName`
- `content` → `BundleInput.content`
- `sourceMap` → `BundleInput.sourceMapReference`
- `type` → `BundleInput.type` (derived from file extension)

## Bundler-Specific Considerations

### Webpack

- **Stats API**: Use `compilation.getStats().toJson()` for module/chunk data
- **Hooks**: `compilation.hooks.processAssets` for bundle extraction
- **Source Maps**: Available in `compilation.assets[filename].sourceMap`
- **Code Splitting**: Chunks defined in `compilation.chunks`
- **Module Graph**: Available via `compilation.moduleGraph`

### Vite/Rollup

- **Output Bundle**: Available in `generateBundle` hook as `OutputBundle`
- **Chunks**: `OutputChunk` objects with `isEntry`, `isDynamicEntry`
- **Modules**: Available in `chunk.modules` object
- **Source Maps**: Inline in `chunk.map` or separate `.map` files
- **SSR**: Separate build output, handled via `writeBundle` hook

### Angular CLI

- **Builder API**: Custom builder implementing `Builder` interface
- **Stats**: Available via `--stats-json` flag (esbuild-based)
- **Lazy Loading**: Routes defined in `angular.json`
- **Modules**: Angular modules mapped to chunks
- **Note**: Only supports new application builder (esbuild/rollup), not legacy webpack builder

### Next.js

- **Webpack Config**: Extend `next.config.js` with custom webpack function
- **Build Hooks**: Use webpack plugin hooks in Next.js build process
- **App Router**: Route-based code splitting
- **Pages Router**: Page-based code splitting
- **Output**: Both `.next` directory structure and webpack stats

## Source Map Extraction

All bundlers support source map extraction:

1. **Inline Source Maps**: Extracted from bundle content (`//# sourceMappingURL=...`)
2. **Separate Files**: Read from `.map` files adjacent to bundles
3. **Bundler APIs**: Some bundlers provide source maps via APIs

The `extractSourceMap` utility handles all three cases.

## Module Resolution

Module paths need normalization across bundlers:

- **Virtual Modules**: Webpack uses `\0` prefix, Rollup uses `\0` prefix
- **Node Modules**: Third-party modules identified by `node_modules` in path
- **Aliases**: Path mappings configured in bundler config
- **Relative vs Absolute**: Normalized to consistent format

## Error Handling

All adapters should:

- Collect non-fatal errors in `errors` array
- Collect warnings in `warnings` array
- Return partial results when possible
- Log detailed errors in debug mode

## Testing Strategy

Each bundler plugin should have:

- Unit tests for adapter extraction logic
- Integration tests with test fixtures
- E2E tests with real bundler builds

## Future Considerations

- **Parcel**: Plugin API for Parcel 2.x
- **Turbopack**: Next.js's new bundler (when stable)
- **esbuild**: Direct integration (currently via Vite/Rollup)
- **SWC**: Rust-based bundler integration
