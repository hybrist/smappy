# Node.js Version Requirement

This project requires **Node.js 24 or higher**.

## Why Node.js 24?

TanStack Start (used for server functions) requires Node.js 22.12.0+ for its server-side rendering capabilities. The project has been configured to use Node.js 24 for compatibility and future-proofing.

## Setting Up the Correct Node Version

### Using nvm (Node Version Manager)

```bash
# Install/use Node.js 24
nvm install 24
nvm use 24

# Or simply use the .nvmrc file
nvm use
```

### Using other version managers

- **fnm**: `fnm use`
- **asdf**: `asdf install nodejs 24 && asdf local nodejs 24`
- **volta**: `volta install node@24`

## Verification

Check your Node.js version:
```bash
node --version
# Should output: v24.x.x
```

## CI/CD Configuration

Ensure your CI/CD pipelines use Node.js 24:

```yaml
# GitHub Actions example
- uses: actions/setup-node@v4
  with:
    node-version: 24

# Or use the .nvmrc file
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
```

## Troubleshooting

If you encounter errors about unsupported Node.js version:
1. Check your current version: `node --version`
2. Install Node.js 24 using your preferred version manager
3. Delete `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
