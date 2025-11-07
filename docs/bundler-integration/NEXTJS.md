# Next.js Webpack Integration Documentation

This document describes how to integrate bundle analysis with Next.js using webpack configuration.

## Smappy Next.js Plugin

We provide a helper that wires the bundle analysis plugin into Next.js builds for both client and server targets:

```javascript
// next.config.js
import { withNextBundleAnalysis } from '../src/lib/server/plugins/nextjs/index.js';

export default withNextBundleAnalysis(
  {
    reactStrictMode: true,
  },
  {
    projectName: 'my-nextjs-app',
    extractSourceMaps: true,
    analyzeClient: true,
    analyzeServer: true,
  },
);
```

The helper automatically detects the build target (`client`, `server`, `edge`, or `middleware`) and attaches the correct plugin instance. For finer-grained control you can instantiate `NextJsBundleAnalysisPlugin` directly inside the `webpack` override.

## Next.js Webpack Configuration

Next.js allows customizing webpack configuration via `next.config.js`.

### Basic Webpack Configuration

```javascript
// next.config.js
module.exports = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack configuration
    return config;
  },
};
```

### Adding Webpack Plugin

```javascript
// next.config.js
const WebpackBundleAnalysisPlugin = require('./webpack-plugin');

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Only analyze client bundles
      config.plugins.push(
        new WebpackBundleAnalysisPlugin({
          projectName: 'my-nextjs-app',
          extractSourceMaps: true,
        }),
      );
    }
    return config;
  },
};
```

## Next.js Build Hooks

### Webpack Hooks in Next.js

Next.js provides access to webpack compilation hooks:

```javascript
webpack: (config, { webpack }) => {
  config.plugins.push({
    apply: (compiler) => {
      compiler.hooks.compilation.tap('NextJsBundleAnalysis', (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'NextJsBundleAnalysis',
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYZE,
          },
          (assets) => {
            // Extract bundle data
          },
        );
      });
    },
  });

  return config;
};
```

### Build Lifecycle Hooks

Next.js does not provide `onBuildStart` and `onBuildComplete` hooks in `next.config.js`. Instead, use webpack plugin hooks:

```javascript
webpack: (config, { webpack }) => {
  config.plugins.push({
    apply: (compiler) => {
      compiler.hooks.beforeRun.tap('BuildLifecyclePlugin', (compiler) => {
        console.log('Build starting...');
      });
      compiler.hooks.done.tap('BuildLifecyclePlugin', (stats) => {
        if (!stats.hasErrors()) {
          // Process bundles
        }
      });
    },
  });
  return config;
};
```

## App Router vs Pages Router

### App Router (Next.js 13+)

App Router uses route-based code splitting:

```
app/
  layout.tsx          → Root layout chunk
  page.tsx            → Home page chunk
  about/
    page.tsx          → About page chunk
  dashboard/
    layout.tsx        → Dashboard layout chunk
    page.tsx          → Dashboard page chunk
```

Each route creates separate chunks automatically.

### Pages Router (Legacy)

Pages Router uses file-based code splitting:

```
pages/
  index.js            → Home page chunk
  about.js            → About page chunk
  dashboard/
    index.js          → Dashboard page chunk
```

## Extracting Bundle Data

### From Webpack Stats

```javascript
webpack: (config, { webpack }) => {
  config.plugins.push({
    apply: (compiler) => {
      compiler.hooks.done.tap('NextJsBundleAnalysis', (stats) => {
        const statsJson = stats.toJson({
          all: false,
          modules: true,
          chunks: true,
          assets: true,
        });

        // Extract data from stats
        const bundles = statsJson.assets
          .filter((asset) => asset.name.endsWith('.js'))
          .map((asset) => ({
            fileName: asset.name,
            size: asset.size,
          }));
      });
    },
  });

  return config;
};
```

### From Build Output

Next.js outputs to `.next` directory:

```javascript
const { readdirSync, readFileSync, statSync } = require('fs');
const { join } = require('path');

function extractBundles(nextDir) {
  const bundles = [];
  const staticDir = join(nextDir, 'static');

  // Client bundles
  const chunksDir = join(staticDir, 'chunks');
  const files = readdirSync(chunksDir, { recursive: true });

  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = join(chunksDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const stats = statSync(filePath);

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

## Source Map Extraction

### From Webpack

```javascript
compilation.hooks.processAssets.tap(
  {
    name: 'NextJsBundleAnalysis',
    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYZE,
  },
  (assets) => {
    for (const [filename, asset] of Object.entries(assets)) {
      if (filename.endsWith('.js')) {
        const sourceMap = assets[`${filename}.map`];
        if (sourceMap) {
          // Extract source map
        }
      }
    }
  },
);
```

### From Build Output

```javascript
const mapFiles = readdirSync(chunksDir).filter((file) => file.endsWith('.map'));

for (const mapFile of mapFiles) {
  const mapPath = join(chunksDir, mapFile);
  const mapContent = readFileSync(mapPath, 'utf-8');
  const bundleName = mapFile.replace('.map', '');
  // Associate with bundle
}
```

## Handling SSR

Next.js builds both client and server bundles:

```javascript
webpack: (config, { isServer }) => {
  if (!isServer) {
    // Client bundle analysis
    config.plugins.push(
      new WebpackBundleAnalysisPlugin({
        projectName: 'my-app',
        buildType: 'client',
      }),
    );
  } else {
    // Server bundle analysis (optional)
    config.plugins.push(
      new WebpackBundleAnalysisPlugin({
        projectName: 'my-app',
        buildType: 'server',
      }),
    );
  }

  return config;
};
```

## Next.js Configuration

### Basic Setup

```javascript
// next.config.js
const WebpackBundleAnalysisPlugin = require('./webpack-plugin');

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new WebpackBundleAnalysisPlugin({
          projectName: 'my-nextjs-app',
          extractSourceMaps: true,
        }),
      );
    }
    return config;
  },
};
```

### With Source Maps

```javascript
module.exports = {
  productionBrowserSourceMaps: true, // Enable source maps in production

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new WebpackBundleAnalysisPlugin({
          extractSourceMaps: true,
        }),
      );
    }
    return config;
  },
};
```

### With Custom Output

```javascript
module.exports = {
  distDir: '.next', // Default

  webpack: (config, { isServer }) => {
    // Access distDir via config.output.path
    return config;
  },
};
```

## Special Considerations

### Static Generation

Next.js generates static pages at build time. These create additional chunks:

```javascript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return [{ slug: 'post-1' }, { slug: 'post-2' }];
}
```

Each static page generates a separate chunk.

### Dynamic Routes

Dynamic routes use code splitting:

```javascript
// app/products/[id]/page.tsx
// Creates chunk for dynamic route handler
```

### API Routes

API routes are server-only and typically not analyzed for client bundles.

### Middleware

Middleware runs on Edge and creates separate bundles.

### Image Optimization

Next.js optimizes images separately. These are assets, not JavaScript bundles.

### Font Optimization

Next.js optimizes fonts. Handle separately if font analysis is needed.

## Implementation Example

```javascript
// next.config.js
const WebpackBundleAnalysisPlugin = require('./webpack-plugin');

module.exports = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new WebpackBundleAnalysisPlugin({
          projectName: 'my-nextjs-app',
          extractSourceMaps: true,
          outputDir: '.next/static',
        }),
      );
    }

    return config;
  },
};
// Note: For custom build output handling, use a custom build script or a webpack plugin.
```

## Version Compatibility

- **Next.js 14.x**: Full support (recommended)
- **Next.js 13.x**: Supported
- **Next.js 12.x**: Supported (webpack 5)
- **Next.js 11.x and below**: Limited support (webpack 4)

## Turbopack (Future)

Next.js is migrating to Turbopack. When stable, a separate integration will be needed:

```javascript
// Future: Turbopack plugin API
experimental: {
  turbo: {
    rules: {
      '*.js': {
        loaders: ['bundle-analysis-loader'],
      },
    },
  },
}
```
