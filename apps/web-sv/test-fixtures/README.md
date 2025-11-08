# Test Fixture Projects

This directory contains realistic test fixture projects for validating bundler plugins and the ingestion system end-to-end.

## Overview

Each fixture project represents a real-world project structure and can be built to generate bundles with source maps. These fixtures are used to:

- Test bundler plugin integration (Webpack, Vite, Next.js)
- Validate bundle ingestion pipeline
- Test source map parsing and symbol extraction
- Verify dependency graph building
- Test code splitting and dynamic imports
- Validate tree-shaking detection

## Fixture Projects

### 1. Webpack 5 Fixture (`webpack-app/`)

A Webpack 5 project with realistic bundle structure including:

- Multiple entry points (main, vendor)
- Code splitting with splitChunks
- TypeScript support
- CSS modules
- Dynamic imports
- Third-party dependencies (lodash)
- Source maps enabled

**Features:**

- Multiple entry points for code splitting
- TypeScript and JavaScript files
- CSS stylesheets
- Dynamic imports for lazy loading
- Unused exports for tree-shaking tests

**Build:**

```bash
cd webpack-app
npm install
npm run build
```

**Output:** `dist/` directory with bundles and source maps

### 2. Vite 5 Fixture (`vite-app/`)

A Vite 5 project with React and code splitting:

- React components with TypeScript
- Manual chunk configuration
- Lazy-loaded components
- Source maps enabled
- CSS modules

**Features:**

- React with TypeScript
- Code splitting via React.lazy()
- Manual chunk splitting (vendor, utils)
- Unused exports for tree-shaking tests

**Build:**

```bash
cd vite-app
npm install
npm run build
```

**Output:** `dist/` directory with chunks and source maps

### 3. Next.js Fixture (`nextjs-app/`)

A Next.js 15 project with App Router:

- App Router structure
- Server and client components
- Dynamic routes
- Code splitting by route
- Source maps enabled

**Features:**

- Next.js App Router structure
- Server Components and Client Components
- Dynamic routes (`/products/[id]`)
- Route-based code splitting
- CSS modules

**Build:**

```bash
cd nextjs-app
npm install
npm run build
```

**Output:** `.next/` directory with production build and source maps

## Rebuilding Fixtures

To rebuild all fixtures:

```bash
# Webpack fixture
cd test-fixtures/webpack-app && npm install && npm run build

# Vite fixture
cd test-fixtures/vite-app && npm install && npm run build

# Next.js fixture
cd test-fixtures/nextjs-app && npm install && npm run build
```

## Usage in Tests

These fixtures can be used in tests to:

1. **Test Plugin Integration:**
   - Load fixture project builds
   - Extract bundle data using plugins
   - Validate plugin output format

2. **Test Ingestion Pipeline:**
   - Pass fixture bundles to `ingestBundle()`
   - Verify modules, symbols, and dependencies are extracted correctly
   - Validate source map processing

3. **Test Query Functions:**
   - Ingest fixture data
   - Query modules, symbols, and dependencies
   - Verify query results match expected structure

## File Structure

Each fixture includes:

- `package.json` - Dependencies and build scripts
- Source files in `src/` or `app/`
- Build configuration files (webpack.config.js, vite.config.ts, next.config.js)
- TypeScript configuration where applicable
- CSS files for styling

## Notes

- **Dependencies:** Each fixture has its own `package.json` and should be built independently
- **Source Maps:** All fixtures generate source maps for comprehensive testing
- **Code Splitting:** All fixtures demonstrate code splitting patterns
- **Tree-Shaking:** Each fixture includes unused exports for tree-shaking detection tests
- **Third-Party Dependencies:** Fixtures include realistic third-party dependencies (lodash, react, etc.)

## Maintenance

When updating fixtures:

1. Ensure builds still succeed
2. Verify source maps are generated
3. Test that ingestion still works with updated bundles
4. Update this README if structure changes
