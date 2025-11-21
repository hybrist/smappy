# Server Functions API

⚠️ **IMPORTANT: Server functions are currently NOT functional** ⚠️

This directory contains TanStack Start server function definitions, but they require proper SSR setup to work. See `vite.config.ts` for detailed setup instructions.

**Current State**: Stub implementations for CI purposes
**Required**: Full TanStack Start SSR configuration (file-based routing, SSR entry points)

---

This directory will contain TanStack Start server functions that provide type-safe data access for the Smappy web application.

## Overview

Server functions are defined using `createServerFn` from TanStack Start, enabling direct server-side code execution without traditional REST API boilerplate. All functions are fully type-safe from database to UI.

## Available Functions

### `getProjects()`

Returns a list of all projects with summary statistics.

**Returns:**

```typescript
Array<{
  projectName: string;
  latestRunDate: string | null;
  totalRuns: number;
}>;
```

**Example:**

```typescript
import { getProjects } from "@/api";

const projects = await getProjects();
```

### `getProjectAnalyses(projectName: string)`

Returns all analysis runs for a specific project.

**Parameters:**

- `projectName` - The name of the project

**Returns:**

```typescript
Array<{
  id: number;
  projectName: string | null;
  createdAt: string;
  bundler: string | null;
  moduleCount: number;
  bundleCount: number;
  totalSize: number;
  totalGzipSize: number | null;
}>;
```

**Example:**

```typescript
const analyses = await getProjectAnalyses("my-app");
```

### `getAnalysisDetails(id: string)`

Returns detailed information about a specific analysis run.

**Parameters:**

- `id` - The analysis run ID (as string)

**Returns:** Same structure as `getProjectAnalyses` items

**Example:**

```typescript
const details = await getAnalysisDetails("123");
```

### `getAnalysisModules(id: string, filters?: AnalysisModuleFilters)`

Returns modules for an analysis with optional filtering and pagination.

**Parameters:**

- `id` - The analysis run ID
- `filters` - Optional filters:
  - `fileType?: string` - Filter by file type
  - `isThirdParty?: boolean` - Filter by third-party status
  - `search?: string` - Search in file paths
  - `page?: number` - Page number (default: 1)
  - `pageSize?: number` - Results per page (default: 50)
  - `sortBy?: 'filePath' | 'originalSize' | 'bundledSize'` - Sort field
  - `sortOrder?: 'asc' | 'desc'` - Sort direction

**Returns:**

```typescript
{
  modules: Array<{
    id: number;
    filePath: string;
    fileType: string;
    originalSize: number;
    bundledSize: number;
    isThirdParty: boolean;
    packageName: string | null;
    packageVersion: string | null;
    exports: string[] | null;
    usedExports: string[] | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }
}
```

**Example:**

```typescript
const result = await getAnalysisModules("123", {
  isThirdParty: true,
  page: 1,
  pageSize: 20,
  sortBy: "bundledSize",
  sortOrder: "desc",
});
```

### `getAnalysisBundles(id: string)`

Returns all bundles for an analysis run.

**Parameters:**

- `id` - The analysis run ID

**Returns:**

```typescript
Array<{
  id: number;
  fileName: string;
  fileType: string;
  size: number;
  gzipSize: number | null;
}>;
```

**Example:**

```typescript
const bundles = await getAnalysisBundles("123");
```

### `getAnalysisDependencyGraph(id: string)`

Returns the dependency graph for visualization.

**Parameters:**

- `id` - The analysis run ID

**Returns:**

```typescript
{
  nodes: Array<{
    id: number;
    filePath: string;
    bundledSize: number;
    isThirdParty: boolean;
    packageName: string | null;
  }>;
  edges: Array<{
    id: number;
    source: number;
    target: number;
    importType: string;
    importedSymbols: string[] | null;
  }>;
}
```

**Example:**

```typescript
const graph = await getAnalysisDependencyGraph("123");
```

### `getAnalysisTreemap(id: string)`

Returns hierarchical data for treemap visualization.

**Parameters:**

- `id` - The analysis run ID

**Returns:**

```typescript
{
  name: string;
  value: number;
  children: Array<{
    name: string;
    value: number;
    children?: Array<{
      name: string;
      value: number;
    }>;
  }>;
}
```

**Example:**

```typescript
const treemap = await getAnalysisTreemap("123");
```

## Integration with TanStack Router

Server functions can be called directly in route loaders:

```typescript
import { createRoute } from '@tanstack/react-router';
import { getProjects } from '@/api';

const projectsRoute = createRoute({
  path: '/projects',
  loader: () => getProjects(),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useLoaderData({ from: '/projects' });
  // projects is fully typed!
  return (
    <div>
      {projects.map((project) => (
        <div key={project.projectName}>{project.projectName}</div>
      ))}
    </div>
  );
}
```

## Error Handling

All server functions include error handling. Errors are logged on the server and thrown as Error objects with descriptive messages.

```typescript
try {
  const projects = await getProjects();
} catch (error) {
  console.error("Failed to load projects:", error);
}
```

## Database

The server functions use an in-memory SQLite database by default, which is seeded with sample data on startup. This can be configured via the `DATABASE_URL` environment variable.

To use a file-based database:

```bash
DATABASE_URL=./smappy.db pnpm dev
```
