# @smappy/store

Persistence layer for CLI analysis results. Provides a simple API for storing and querying analysis results in a user's home directory without polluting project directories.

## Features

- **Persistent storage**: Store analysis results in `~/.smappy/analysis.db` (configurable)
- **CRUD operations**: Save, list, and query analysis runs
- **Automatic migrations**: Schema initialization with auto-migration support
- **Project isolation**: Filter and query analysis runs by project name
- **Pruning**: Clean up old analysis runs to free up space
- **Type-safe**: Full TypeScript support with Drizzle ORM

## Installation

This package is part of the Smappy monorepo and is automatically available to other packages via workspace references.

## Usage

```typescript
import { createStore } from "@smappy/store";

// Create a store instance (defaults to ~/.smappy/analysis.db)
const store = createStore();

// Save analysis results
const result = store.saveAnalysisRun({
  projectName: "my-app",
  bundler: "vite",
  bundles: [
    {
      fileName: "main.js",
      fileType: "javascript",
      size: 1024,
      gzipSize: 512,
    },
  ],
  modules: [
    {
      filePath: "src/index.ts",
      fileType: "javascript",
      originalSize: 512,
      bundledSize: 256,
      isThirdParty: false,
    },
  ],
  chunks: [
    {
      name: "main",
      totalSize: 1024,
      isEntry: true,
      isAsync: false,
    },
  ],
});

console.log(`Saved analysis run with ID: ${result.analysisRunId}`);

// Query historical data
const runs = store.listAnalysisRuns({
  projectName: "my-app",
  limit: 10,
});

const latest = store.getLatestAnalysisRun("my-app");
console.log(`Latest run has ${latest?.bundleCount} bundles`);

// Cleanup old runs
const deleted = store.pruneAnalysisRuns({
  olderThanDays: 30,
  keepMinimum: 5,
});
console.log(`Deleted ${deleted} old runs`);

// Close the database connection
store.close();
```

## Configuration

### Database Path

The database path can be configured via:

1. **Environment variable** (highest priority):

   ```bash
   export SMAPPY_DB_PATH=/custom/path/to/analysis.db
   ```

2. **Constructor option**:

   ```typescript
   const store = createStore({
     dbPath: "~/.smappy/custom-analysis.db",
   });
   ```

3. **Default**: `~/.smappy/analysis.db`

The `~` symbol is automatically expanded to the user's home directory.

### Auto-migration

By default, migrations are automatically applied when creating a new database. To disable this:

```typescript
const store = createStore({
  autoMigrate: false,
});
```

In production, it's recommended to run migrations manually via `drizzle-kit migrate`.

## API Reference

### `createStore(options?)`

Creates a new store instance.

**Options:**

- `dbPath?: string` - Path to the database file (defaults to `~/.smappy/analysis.db`)
- `autoMigrate?: boolean` - Whether to auto-apply migrations (defaults to `true`)

**Returns:** `Store` instance

### `store.saveAnalysisRun(data)`

Saves a new analysis run with full data.

**Parameters:**

- `data: SaveAnalysisRunInput` - Analysis run data including bundles, modules, and chunks

**Returns:** `SaveAnalysisRunResult` with analysis run ID and statistics

### `store.listAnalysisRuns(options?)`

Lists analysis runs with optional filtering.

**Options:**

- `projectName?: string` - Filter by project name
- `limit?: number` - Maximum number of results
- `offset?: number` - Offset for pagination

**Returns:** Array of `AnalysisRunData` objects

### `store.getLatestAnalysisRun(projectName)`

Gets the latest analysis run for a project.

**Parameters:**

- `projectName: string` - Project name

**Returns:** `AnalysisRunData | null`

### `store.getAnalysisRunById(id)`

Gets an analysis run by ID.

**Parameters:**

- `id: number` - Analysis run ID

**Returns:** `AnalysisRunData | null`

### `store.pruneAnalysisRuns(options?)`

Prunes old analysis runs, keeping a minimum per project.

**Options:**

- `olderThanDays?: number` - Delete runs older than this many days
- `keepMinimum?: number` - Keep at least this many runs per project (defaults to 5)

**Returns:** Number of runs deleted

### `store.close()`

Closes the database connection. Always call this when done with the store.

## Schema

The store uses the same schema as the web application (`apps/web-sv/src/lib/server/db/schema.ts`), including:

- `AnalysisRun` - Root entity for each analysis
- `Bundle` - Generated bundle files
- `Module` - Source modules
- `Chunk` - Logical chunk groupings
- `Dependency` - Module dependencies
- `Symbol` - Source symbols
- And more...

See the schema file for complete details.

## Testing

Run tests with:

```bash
pnpm --filter @smappy/store test
```

Tests use temporary in-memory databases and clean up automatically.

## Development

### Building

```bash
pnpm --filter @smappy/store build
```

### Type Checking

```bash
pnpm --filter @smappy/store check
```

## Migration Strategy

The store package shares migrations with the web application. Migration files are located in `apps/web-sv/drizzle/` and are automatically discovered by the store when initializing a new database.

For production deployments, run migrations manually:

```bash
cd apps/web-sv
pnpm db:migrate
```

## Related

- [`@smappy/web-sv`](../web-sv/README.md) - Web application using the same schema
- [`@smappy/cli`](../cli/README.md) - CLI tool that uses this package for persistence
