# SvelteKit Bundle Analysis Integration

This guide shows how to analyze your SvelteKit application's bundle with Smappy.

## Quick Start

SvelteKit uses Vite under the hood, so we can use the Vite plugin to analyze builds.

### Installation

```bash
# If analyzing an external SvelteKit app
npm install smappy-plugin --save-dev

# If analyzing Smappy itself (dogfooding)
# Plugin is already available locally
```

### Configuration

Add the plugin to your `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { viteBundleAnalysisPlugin } from '@smappy/cli/src/plugins/vite/plugin.js';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    viteBundleAnalysisPlugin({
      projectName: 'my-sveltekit-app',
      autoIngest: true,
    }),
  ],
});
```

### Plugin Options

```typescript
interface VitePluginOptions {
  /** Project name for grouping analyses */
  projectName: string;

  /** Automatically ingest bundles after build (default: true) */
  autoIngest?: boolean;

  /** Output directory where bundles are written (default: 'dist') */
  buildOutputDir?: string;

  /** Enable debug logging */
  debug?: boolean;
}
```

## Running Analysis

### Production Build

```bash
npm run build
```

The plugin automatically runs during the build process and ingests bundle data into the Smappy database.

### What Gets Analyzed

SvelteKit builds produce multiple bundles:

1. **Client Build** (`build/client/`)
   - Entry points (e.g., `app-*.js`)
   - Page components (code-split)
   - Shared chunks
   - Static assets

2. **Server Build** (`build/server/`) - optional SSR analysis
   - Server-side rendering code
   - API route handlers
   - Server-only utilities

## Viewing Results

After running `npm run build`, view your analysis at:

```
http://localhost:5173/dashboard/my-sveltekit-app
```

Or start the dev server if it's not running:

```bash
npm run dev
```

## Example: Analyzing Smappy Itself

Smappy can analyze its own bundle! Here's how:

### 1. Add Plugin Configuration

Edit `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { viteBundleAnalysisPlugin } from '@smappy/cli/src/plugins/vite/plugin.js';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),

    // Analyze Smappy's own bundle
    viteBundleAnalysisPlugin({
      projectName: 'smappy',
      autoIngest: true,
      debug: true, // Enable detailed logging
    }),
  ],

  // ... rest of config
});
```

### 2. Run Build

```bash
pnpm run build
```

### 3. View Analysis

Navigate to: `http://localhost:5173/dashboard/smappy`

You'll see:

- Bundle sizes for client and server
- Module breakdown
- Dependency graph
- Code-splitting effectiveness
- Optimization suggestions

## Understanding SvelteKit Bundle Structure

### Client Bundle

SvelteKit code-splits at the route level by default:

```
build/client/
├── _app/
│   ├── immutable/
│   │   ├── entry/
│   │   │   ├── start-[hash].js      # SvelteKit runtime
│   │   │   └── app-[hash].js        # Your app root
│   │   ├── chunks/
│   │   │   ├── scheduler-[hash].js  # Svelte runtime
│   │   │   └── index-[hash].js      # Shared chunks
│   │   └── nodes/
│   │       ├── 0-[hash].js          # Layout
│   │       ├── 1-[hash].js          # Error page
│   │       ├── 2-[hash].js          # /routes/+page
│   │       └── 3-[hash].js          # /routes/dashboard/+page
│   └── version.json
└── ...
```

Each `nodes/` file represents a route component, allowing lazy loading.

### Common Issues

#### Large Entry Chunks

**Problem**: `app-*.js` is very large

**Solution**:

- Split large components into separate chunks
- Use dynamic imports: `const Component = () => import('./BigComponent.svelte')`
- Review Vite's `manualChunks` configuration

#### Duplicate Dependencies

**Problem**: Same library bundled multiple times

**Solution**:

- Use Vite's `build.rollupOptions.output.manualChunks`
- Example:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', '@sveltejs/kit'],
          ui: ['chart.js', 'd3'],
        },
      },
    },
  },
});
```

#### No Source Maps

**Problem**: Can't see module-level details

**Solution**: Enable source maps in production build:

```typescript
export default defineConfig({
  build: {
    sourcemap: true, // or 'hidden' for external files
  },
});
```

## Advanced Configuration

### SSR Bundle Analysis

To analyze server-side bundle separately:

```typescript
viteBundleAnalysisPlugin({
  projectName: 'my-app-server',
  buildOutputDir: 'build/server',
  handleSSR: true,
});
```

### Custom Output Directory

For non-standard output locations:

```typescript
viteBundleAnalysisPlugin({
  projectName: 'my-app',
  buildOutputDir: 'custom-dist',
});
```

### Conditional Analysis

Only analyze in CI or specific environments:

```typescript
const plugins = [sveltekit()];

if (process.env.ANALYZE_BUNDLE === 'true') {
  plugins.push(
    viteBundleAnalysisPlugin({
      projectName: 'my-app',
      autoIngest: true,
    }),
  );
}

export default defineConfig({ plugins });
```

Run with: `ANALYZE_BUNDLE=true npm run build`

## Comparison with Other SvelteKit Apps

Track bundle size over time or compare against other projects:

1. **Historical Tracking**: Each build creates a new analysis run
2. **Compare View**: Navigate to `/dashboard/my-app/compare`
3. **Metrics**: Track trends in total size, module count, chunk count

## Integration with CI/CD

### GitHub Actions

```yaml
name: Bundle Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run build

      - name: Upload bundle analysis
        run: |
          # Bundle analysis already saved to database
          echo "Analysis complete: $BUNDLE_SIZE bytes"
```

### Bundle Size Budgets

Fail CI if bundle exceeds thresholds:

```typescript
viteBundleAnalysisPlugin({
  projectName: 'my-app',
  autoIngest: true,
  thresholds: {
    totalSize: 500 * 1024, // 500 KB
    chunkSize: 200 * 1024, // 200 KB per chunk
  },
});
```

## Performance Tips

### 1. Route-Based Code Splitting (Default)

SvelteKit automatically splits by route. Keep routes focused and avoid importing heavy libraries at the root layout level.

### 2. Dynamic Imports for Heavy Components

```typescript
<script>
  import { onMount } from 'svelte';

  let ChartComponent;

  onMount(async () => {
    const module = await import('./HeavyChart.svelte');
    ChartComponent = module.default;
  });
</script>

{#if ChartComponent}
  <svelte:component this={ChartComponent} />
{/if}
```

### 3. Tree Shaking

Ensure libraries are tree-shakeable:

```typescript
// Good - imports only what's needed
import { specific } from 'library';

// Bad - imports entire library
import * as library from 'library';
```

### 4. Analyze with Smappy

Use Smappy's suggestions feature to identify:

- Duplicate dependencies
- Large unused code
- Opportunities for code splitting

## Troubleshooting

### Plugin Not Running

**Check**:

1. Plugin is in `plugins` array after `sveltekit()`
2. Running production build: `npm run build` (not `dev`)
3. No build errors preventing completion

### No Data in Dashboard

**Check**:

1. Database connection configured (DATABASE_URL)
2. Build completed successfully
3. Check console for "[Vite Bundle Analysis]" messages
4. Verify project name matches dashboard URL

### SSR Bundle Not Analyzed

**Check**:

1. SvelteKit adapter supports SSR (not static adapter)
2. `handleSSR: true` in plugin options
3. Server build directory exists: `build/server`

### Duplicate Module Errors (Known Issue)

**Issue**: UNIQUE constraint failed: Module.analysis_run_id, Module.file_path

**Cause**: SvelteKit builds both client and server bundles, and the plugin runs for each build, trying to insert the same modules twice.

**Workaround**: Analyze only the client build (which contains most of your app code):

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { viteBundleAnalysisPlugin } from '@smappy/cli/src/plugins/vite/plugin.js';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    sveltekit(),

    // Only analyze client build
    ...(!isSsrBuild
      ? [
          viteBundleAnalysisPlugin({
            projectName: 'my-app',
            autoIngest: true,
          }),
        ]
      : []),
  ],
}));
```

**Status**: We're working on properly handling SSR builds separately. Track progress at GitHub issue #XXX.

## Related Documentation

- [Vite Plugin API](./VITE.md) - Lower-level Vite plugin details
- [Architecture](./ARCHITECTURE.md) - Overall system architecture
- [SvelteKit Docs](https://kit.svelte.dev/docs) - Official SvelteKit documentation
- [Vite Docs](https://vitejs.dev/guide/) - Vite bundler documentation

## Example Projects

Check out these examples:

1. **Smappy itself** - This project analyzes its own bundle
2. **Basic SvelteKit app** - See `test-fixtures/` for minimal example
3. **Production apps** - Real-world SvelteKit applications using Smappy

## Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/hybrist/smappy/issues)
2. Enable debug logging: `debug: true` in plugin options
3. Review build output for warnings/errors
4. Consult the [Architecture docs](./ARCHITECTURE.md)
