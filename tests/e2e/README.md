# Dashboard E2E Tests

This directory contains end-to-end tests for the Smappy dashboard UI.

## Test Coverage

The dashboard e2e tests (`dashboard.spec.ts`) cover:

### Dashboard Landing Page

- Displaying project list with cards
- Navigation to individual project dashboards
- Proper rendering of page title and description

### Project Dashboard Page

- Displaying bundle statistics (Total Size, Modules, Bundler)
- Showing correct module counts
- Displaying bundler type (vite, webpack, rollup, etc.)
- Project selector functionality
- Handling non-existent projects gracefully

## Running the Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run e2e tests in UI mode (for debugging)
pnpm test:e2e:ui

# Run e2e tests in debug mode
pnpm test:e2e:debug
```

## Test Setup

The tests use Playwright to:

1. Start a development server automatically
2. Ingest test bundle data before each test
3. Navigate to dashboard pages and verify UI elements
4. Use in-memory SQLite database for isolation

## Environment Variables

- `DATABASE_URL` - Set to `:memory:` for tests to use in-memory SQLite database

## Known Issues

- Tests may timeout in some CI environments due to browser installation issues
- The tests require chromium browser to be installed via `npx playwright install chromium`
