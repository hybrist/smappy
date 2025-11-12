# Bundler Integration Documentation

This directory contains comprehensive documentation for integrating bundle analysis with various JavaScript bundlers.

## Overview

The bundle analysis system uses a plugin-based architecture that normalizes bundler-specific output into a common format. Each bundler requires a plugin that extracts bundle data and converts it to the ingestion system's input format.

## Documentation Index

### Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Overall architecture, data flow, and mapping strategies

### Bundler-Specific APIs

- **[SVELTEKIT.md](./SVELTEKIT.md)** - SvelteKit bundle analysis integration guide (⭐ Start here if using SvelteKit!)
- **[VITE.md](./VITE.md)** - Vite plugin API (based on Rollup) and integration guide
- **[ROLLUP.md](./ROLLUP.md)** - Rollup plugin API and integration guide
- **[WEBPACK.md](./WEBPACK.md)** - Webpack plugin API, hooks, and integration guide
- **[ANGULAR.md](./ANGULAR.md)** - Angular CLI builder API and integration guide
- **[NEXTJS.md](./NEXTJS.md)** - Next.js webpack configuration and build hooks

## Quick Start

### For Plugin Developers

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the overall system
2. Review the bundler-specific documentation for your target bundler
3. Implement a plugin that extends `BundlerAdapter`
4. Map bundler output to `BundleInput`, `ModuleInput`, `ChunkInput`

### For Users

1. Install the appropriate plugin for your bundler
2. Configure the plugin in your bundler's configuration file
3. Run your build - bundles will be automatically analyzed

## Common Patterns

### Source Map Extraction

All bundlers support source map extraction:

- **Inline**: Extract from bundle content (`//# sourceMappingURL=...`)
- **Separate Files**: Read from `.map` files
- **Bundler APIs**: Use bundler-specific APIs when available

### Module Resolution

Module paths need normalization:

- Virtual modules (prefixed with `\0`)
- Node modules (identified by `node_modules` in path)
- Path aliases (configured in bundler config)
- Relative vs absolute paths

### Code Splitting

All bundlers support code splitting:

- Entry chunks (initial load)
- Async chunks (lazy loaded)
- Dynamic imports create async chunks

## Implementation Status

| Bundler     | Status        | Documentation              | Implementation      |
| ----------- | ------------- | -------------------------- | ------------------- |
| Vite        | ✅ Complete   | [VITE.md](./VITE.md)       | `src/plugins/vite/` |
| Rollup      | ✅ Complete   | [ROLLUP.md](./ROLLUP.md)   | Via Vite adapter    |
| Webpack     | 📝 Documented | [WEBPACK.md](./WEBPACK.md) | Planned             |
| Angular CLI | 📝 Documented | [ANGULAR.md](./ANGULAR.md) | Planned             |
| Next.js     | 📝 Documented | [NEXTJS.md](./NEXTJS.md)   | Planned             |

## Related Code

- **Plugin Base Types**: `src/plugins/types.ts`
- **Plugin Utilities**: `src/plugins/utils.ts`
- **Adapter Base Class**: `src/plugins/adapters.ts`
- **Ingestion Types**: `src/lib/server/ingestion/types/index.ts`
- **Vite Plugin**: `src/plugins/vite/plugin.ts`
- **Vite Adapter**: `src/plugins/vite/adapter.ts`

## Contributing

When adding support for a new bundler:

1. Create documentation in this directory
2. Implement the plugin following the architecture
3. Add tests for the plugin
4. Update this README with implementation status

## Resources

- [Webpack Plugin API](https://webpack.js.org/api/plugins/)
- [Rollup Plugin API](https://rollupjs.org/plugin-development/)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [Angular Builder API](https://angular.io/guide/cli-builder)
- [Next.js Webpack Config](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
