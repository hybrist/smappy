# Node.js Version Requirement

This project works with **Node.js 20+**, but **Node.js 24 is recommended** for TanStack Start features.

## Version Compatibility

- **Node.js 20+**: ✅ Express implementation works (current default)
- **Node.js 24+**: ✅ TanStack Start implementation available

## Why Node.js 24?

TanStack Start (used for server functions) requires Node.js 22.12.0+ for its server-side rendering capabilities. The project includes a TanStack Start implementation that can be activated when Node.js 24 is available.

## Current Implementation

The repository includes two implementations:

1. **Express-based** (default) - Works with Node 20+
2. **TanStack Start** (optional) - Requires Node 24+

The Express implementation is fully functional and ready to use. The TanStack Start implementation is available in `.tanstack.ts` files and can be activated when Node 24 is available.

## Setting Up Node.js 24 (Optional)

If you want to use TanStack Start features:

### Using nvm (Node Version Manager)

```bash
# Install/use Node.js 24
nvm install 24
nvm use 24
```

### Using other version managers

- **fnm**: `fnm install 24 && fnm use 24`
- **asdf**: `asdf install nodejs 24 && asdf local nodejs 24`
- **volta**: `volta install node@24`

## Verification

Check your Node.js version:

```bash
node --version
# Should output: v20.x.x or higher
```

## CI/CD Configuration

For CI/CD pipelines, Node 20 works with the Express implementation:

```yaml
# GitHub Actions example
- uses: actions/setup-node@v4
  with:
    node-version: 20 # or 24 for TanStack Start
```

## Migration to TanStack Start

Once you have Node.js 24, you can activate TanStack Start features by following the guide in `TANSTACK_START_GUIDE.md`.
