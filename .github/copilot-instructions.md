# Guide for AI Agents (Claude, Copilot, etc.)

This document provides specific guidance for AI coding agents working on the Smappy project.

## Running Tests in Sandboxed Environments

AI agents typically operate in sandboxed environments with network restrictions. This affects how tests can be run:

### E2E Tests (Playwright)

Playwright requires a browser to run end-to-end tests. In sandboxed environments where Playwright cannot download browsers, use the system's installed Chrome:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm test:e2e
```

This environment variable configures Playwright to use the system Chrome instead of attempting to download its own browser binary.

### Build

The build command works in sandboxed environments but may show warnings about network-fetched plugins:

```bash
pnpm build
```

These warnings are expected and don't prevent successful builds.

## Environment Variables Reference

- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` - Use system Chrome for Playwright tests
- `DATABASE_URL=:memory:` - Use in-memory SQLite database (useful for tests)
- `CI=true` - Automatically set in CI; affects Playwright reporter behavior

## Additional Resources

For general contributor workflow, see [docs/CONTRIBUTING.md](../apps/web-sv/docs/CONTRIBUTING.md).

For detailed E2E test documentation, see [tests/e2e/README.md](../apps/web-sv/tests/e2e/README.md).
