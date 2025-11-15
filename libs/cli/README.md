# Smappy CLI

Command-line interface for analyzing JavaScript/TypeScript projects and extracting bundle information.

## Overview

Smappy CLI automatically detects your project's bundler and framework, then runs a build with analysis plugins injected to extract detailed bundle data without modifying your project files.

## Features

- 🔍 **Auto-detection**: Automatically detects bundler (Vite, Webpack, Next.js, Angular) and framework
- 🔌 **Zero-config**: No need to modify your project configuration files
- 🧹 **Clean**: Temporary configs are automatically cleaned up after analysis
- 📊 **Comprehensive**: Extracts bundles, modules, chunks, and dependencies
- 🚀 **Fast**: Efficient analysis with minimal overhead

## Installation

```bash
# Install globally
npm install -g @smappy/cli

# Or use with npx
npx @smappy/cli analyze
```

## Usage

### Analyze Command

Analyze a JavaScript/TypeScript project:

```bash
# Analyze current directory
smappy analyze

# Analyze specific directory
smappy analyze /path/to/project

# Verbose output
smappy analyze --verbose

# Override bundler detection
smappy analyze --bundler vite

# Override framework detection
smappy analyze --framework react
```

#### Options

- `projectPath` - Path to the project directory (default: current directory)
- `--bundler <name>` - Override bundler detection (vite, webpack, nextjs, rollup, angular)
- `--framework <name>` - Override framework detection (react, vue, svelte, angular, nextjs, etc.)
- `--verbose` - Enable verbose output
- `--skip-build` - Generate config but don't run build (for testing)
- `--keep-temp` - Keep temporary files for debugging

### Detect Command

Detect bundler and framework without running analysis:

```bash
# Detect in current directory
smappy detect

# Detect specific directory
smappy detect /path/to/project

# Show detection details
smappy detect --verbose
```

## How It Works

1. **Detection**: Scans your project to identify the bundler and framework
2. **Config Generation**: Creates a temporary config file that extends your existing config
3. **Plugin Injection**: Adds Smappy analysis plugin to the build process
4. **Build Execution**: Runs the build with the temporary config
5. **Data Extraction**: Plugin extracts bundle data during the build
6. **Cleanup**: Removes temporary files automatically

## Supported Bundlers

| Bundler | Status     | Config Generation | Plugin |
| ------- | ---------- | ----------------- | ------ |
| Vite    | ✅ Full    | Yes               | Yes    |
| Webpack | ✅ Full    | Yes               | Yes    |
| Next.js | ✅ Full    | Yes               | Yes    |
| Angular | ✅ Full    | Builder API       | Yes    |
| Rollup  | ⚠️ Partial | Yes               | No     |
| ESBuild | ❌ Not yet | No                | No     |
| Parcel  | ❌ Not yet | No                | No     |

## Configuration

### Temporary Configs

Smappy generates temporary configuration files in your OS temp directory (e.g., `/tmp/smappy-{bundler}-{timestamp}/`). These configs:

- Import and extend your existing config
- Add the Smappy analysis plugin
- Preserve all your build settings
- Are automatically cleaned up after analysis

Example generated Vite config:

```typescript
import { defineConfig, mergeConfig } from "vite";
import { viteBundleAnalysisPlugin } from "@smappy/cli/plugins/vite";

export default defineConfig(async () => {
  // Import user's config
  const userConfig = await import("/path/to/vite.config.ts");

  // Add Smappy plugin
  const smappyConfig = {
    plugins: [viteBundleAnalysisPlugin({ projectName: "my-app" })],
  };

  // Merge and return
  return mergeConfig(userConfig, smappyConfig);
});
```

### Keeping Temporary Files

For debugging, you can keep temporary files:

```bash
smappy analyze --keep-temp
```

This will print the location of temporary files and leave them for inspection.

## Architecture

The CLI is organized into several modules:

- **Detection** (`src/detection/`) - Bundler and framework detection
- **Config** (`src/config/`) - Temporary config generation
- **Runner** (`src/runner/`) - Build execution
- **Plugins** (`src/plugins/`) - Bundler-specific analysis plugins
- **Ingestion** (`src/ingestion/`) - Data ingestion (stub for now)
- **Commands** (`src/cmds/`) - CLI commands (analyze, detect)

See [Config Module README](./src/config/README.md) for details on config generation.

See [Bundler Integration docs](./docs/bundler-integration/README.md) for details on bundler plugins.

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/config/vite.spec.ts

# Watch mode
pnpm test --watch
```

### Linting

```bash
# Check formatting
pnpm format:check

# Fix formatting
pnpm format
```

## Examples

Example projects for testing are in the `examples/` directory:

- `examples/vite-app/` - Vite + React app
- `examples/webpack-app/` - Webpack app
- `examples/nextjs-app/` - Next.js app

## Troubleshooting

### "Could not detect bundler"

Make sure your project has a recognizable bundler config file:

- Vite: `vite.config.ts` or `vite.config.js`
- Webpack: `webpack.config.js`
- Next.js: `next.config.js`
- Angular: `angular.json`

Or override with `--bundler` flag:

```bash
smappy analyze --bundler vite
```

### Build fails

Enable verbose mode to see build output:

```bash
smappy analyze --verbose
```

Check that:

- Dependencies are installed (`npm install`)
- Your project builds normally without Smappy
- You're using a supported bundler version

### Temporary files not cleaned up

Temporary files should be cleaned up automatically. If they're not:

1. Check for zombie processes
2. Manually clean temp directory: `/tmp/smappy-*`
3. Report the issue

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](../../LICENSE) file.
