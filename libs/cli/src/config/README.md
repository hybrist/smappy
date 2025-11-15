# Config Generation Module

This module generates temporary bundler configuration files that inject Smappy analysis plugins without modifying the user's project files.

## Overview

The config generation module creates temporary configs in the OS temp directory that:
1. Import and extend the user's existing config (if present)
2. Add the Smappy analysis plugin
3. Preserve all user settings
4. Clean up automatically after analysis

## Supported Bundlers

- ✅ **Vite**: Full support with config merging
- ✅ **Webpack**: Full support with plugin injection
- ✅ **Next.js**: Full support with webpack config wrapping
- ⚠️ **Rollup**: Basic support (plugin not yet implemented)
- ❌ **Angular**: Uses builder API (no temp config needed)

## Usage

### From Analyze Command

The analyze command automatically uses this module:

```typescript
import { analyzeCommand } from './cmds/analyze.js';

await analyzeCommand('/path/to/project', {
  verbose: true,
  keepTemp: false,  // Don't keep temp files
  skipBuild: false, // Run the build
});
```

### Direct Usage

```typescript
import { generateTempConfig } from './config/index.js';

const result = await generateTempConfig({
  projectPath: '/path/to/project',
  projectName: 'my-app',
  bundler: 'vite',
  debug: true,
  keepTemp: false,
});

// Use the generated config
console.log('Config path:', result.configPath);

// Clean up when done
await result.cleanup();
```

## Architecture

### Config Generators

Each bundler has its own config generator that implements the `ConfigGenerator` interface:

```typescript
interface ConfigGenerator {
  generate(options: TempConfigOptions): Promise<TempConfigResult>;
  supports(bundler: DetectionResult['bundler']): boolean;
}
```

### Factory Pattern

The `factory.ts` module selects the appropriate generator:

```typescript
const generator = getConfigGenerator('vite');
const result = await generator.generate(options);
```

### Cleanup

Cleanup is handled automatically via:
- Process exit handlers (`process.on('exit')`)
- Signal handlers (SIGINT, SIGTERM)
- Manual cleanup via `result.cleanup()`

## Generated Config Structure

### Vite

```typescript
import { defineConfig, mergeConfig } from 'vite';
import { viteBundleAnalysisPlugin } from '@smappy/cli/plugins/vite';

export default defineConfig(async () => {
  // Import user's existing config
  let userConfig;
  try {
    const imported = await import('/path/to/vite.config.ts');
    userConfig = imported.default || imported;
    
    if (typeof userConfig === 'function') {
      userConfig = await userConfig({ command: 'build', mode: 'production' });
    }
  } catch (error) {
    userConfig = {};
  }

  // Add Smappy plugin
  const smappyConfig = {
    plugins: [
      viteBundleAnalysisPlugin({
        projectName: 'my-app',
        autoIngest: true,
        debug: false,
      }),
    ],
  };

  // Merge and return
  return mergeConfig(userConfig, smappyConfig);
});
```

### Webpack

```javascript
const { webpackBundleAnalysisPlugin } = require('@smappy/cli/plugins/webpack');

// Import user's existing config
let userConfig = require('/path/to/webpack.config.js');

if (userConfig.default) {
  userConfig = userConfig.default;
}

if (typeof userConfig === 'function') {
  userConfig = userConfig({ mode: 'production' }, {});
}

// Add Smappy plugin
if (!userConfig.plugins) {
  userConfig.plugins = [];
}

userConfig.plugins.push(
  webpackBundleAnalysisPlugin({
    projectName: 'my-app',
    autoIngest: true,
    productionOnly: false,
  }, {
    debug: false,
  })
);

module.exports = userConfig;
```

## Testing

The module includes comprehensive tests:

```bash
pnpm test src/config/
```

Test coverage includes:
- ✅ Config generation for all bundlers
- ✅ Extending user configs
- ✅ Minimal config generation
- ✅ Cleanup functionality
- ✅ Temp directory management
- ✅ Factory pattern selection

## Limitations

### Plugin Import Resolution

The generated configs import plugins from `@smappy/cli/plugins/*`. This works when:
- The CLI is installed as a dependency in the project
- The CLI is run via `npx` (which makes it available)
- In development when using relative paths

**Future Enhancement**: Consider inlining plugin code or using programmatic APIs to avoid import dependencies.

### TypeScript Configs

TypeScript configs are dynamically imported, which requires:
- The bundler to support TS configs (Vite, Next.js do natively)
- Or the config to be compiled to JS first (Webpack, Rollup)

### Config Functions

Some configs export functions instead of objects. We handle this by:
- Detecting function exports
- Calling with appropriate context
- Waiting for async results

## Future Enhancements

- [ ] Cache generated configs for faster subsequent runs
- [ ] Support for custom plugin injection points
- [ ] Dry-run mode to preview generated config
- [ ] Config validation before build
- [ ] Inline plugin code to avoid import issues
- [ ] Support for ESBuild and Parcel
