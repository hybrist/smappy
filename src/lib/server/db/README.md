# Database Seed Data

This directory contains database utilities including seed data for development and testing.

## Overview

The seed data module (`seed.ts`) provides reusable, realistic example analysis data that can be used:

- **In tests**: Consistent, maintainable test data
- **For development**: Quickly populate the database with example data to test the UI
- **For demos**: Showcase the application with realistic bundle analysis data

## Using Seed Data

### Manual Seeding (Development)

To seed the database with example data for development:

```bash
# Seed with realistic data (default)
pnpm run db:seed

# Seed with minimal data (single simple project)
pnpm run db:seed --profile minimal

# Seed with comprehensive data (multiple projects, various bundlers)
pnpm run db:seed --profile comprehensive

# Add seed data without cleaning existing data
pnpm run db:seed --no-clean
```

After seeding, start the dev server and view the dashboard:

```bash
pnpm run dev
# Visit http://localhost:5173/dashboard
```

### In Tests

Tests can use the seed data module to create consistent test data:

```typescript
import {
  cleanDatabase,
  createDashboardTestData,
  createRealisticSeedData,
} from '../../src/lib/server/db/seed.js';
import { ingestBundle } from '../../src/lib/server/ingestion/index.js';

test.beforeEach(async () => {
  // Clean database
  await cleanDatabase();

  // Use pre-defined test data
  const { detailedProject } = createDashboardTestData();
  await ingestBundle(detailedProject);

  // Or create custom realistic data
  const project = createRealisticSeedData('my-project');
  await ingestBundle(project);
});
```

## Seed Data Profiles

### Minimal

A single simple project with one module. Useful for basic testing and minimal data scenarios.

- 1 project (`minimal-example`)
- 1 module
- 1 bundle
- Vite bundler

### Realistic (Default)

A typical React/TypeScript application with components, utilities, and third-party dependencies. Good for development and realistic testing scenarios.

- 1 project (`react-dashboard`)
- 8 modules (components, utilities, React libraries)
- Multiple chunks
- Realistic dependency graph
- Vite bundler

### Comprehensive

Multiple projects with different characteristics and bundlers. Useful for testing multi-project scenarios and bundler variations.

- 4 projects:
  - `minimal-example` (simple project)
  - `ecommerce-frontend` (realistic React app)
  - `admin-dashboard` (realistic React app)
  - `legacy-webapp` (Webpack project with jQuery/Lodash)
- Various bundlers (Vite, Webpack)
- Different module types and structures

## Programmatic Usage

You can also use the seed data module programmatically:

```typescript
import { seedDatabase, cleanDatabase, createRealisticSeedData } from './seed.js';

// Seed the entire database
await seedDatabase('realistic', true);

// Clean the database
await cleanDatabase();

// Create custom seed data
const projectData = createRealisticSeedData('my-custom-project');
await ingestBundle(projectData);
```

## Seed Data Structure

Each seed data profile returns `BundleIngestionInput` objects that match the structure expected by the ingestion system:

```typescript
interface BundleIngestionInput {
  options: {
    bundlerType: 'vite' | 'webpack' | 'rollup' | 'esbuild' | 'parcel';
    projectName: string;
    enableIncremental: boolean;
  };
  bundles: BundleInput[];
  modules: ModuleInput[];
  chunks: ChunkInput[];
}
```

## Best Practices

1. **Tests**: Always use `cleanDatabase()` before seeding in tests to ensure a clean state
2. **Development**: Use the `--no-clean` flag if you want to preserve existing data
3. **CI/CD**: Tests automatically use in-memory databases and clean before each test
4. **Customization**: Create your own seed data functions based on the provided examples

## Files

- `seed.ts` - Seed data module with all seed data functions
- `index.ts` - Database client and schema
- `schema.ts` - Drizzle ORM schema definitions
- `README.md` - This file

## Related Scripts

- `pnpm run db:seed` - Seed the database with example data
- `pnpm run db:studio` - Open Drizzle Studio to view database contents
- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:migrate` - Run database migrations
