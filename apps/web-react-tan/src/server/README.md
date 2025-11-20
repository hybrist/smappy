# Server Functions for Bundle Analysis

This directory contains type-safe server functions for accessing bundle analysis data. These functions provide a clean, type-safe interface for data access without the need for a traditional REST API.

## Architecture

The server functions architecture consists of:

1. **Database Connection** (`db.ts`) - Manages SQLite database connection using Drizzle ORM
2. **Server Functions** (`functions.ts`) - Type-safe server-side data access functions
3. **API Server** (`api.ts`) - Express server that exposes functions as HTTP endpoints
4. **Client Wrapper** (`../api/client.ts`) - Client-side functions that call the API

## Benefits

- **Type Safety**: Full TypeScript support from server to client
- **Simplified Development**: Direct function calls instead of REST endpoints
- **End-to-End Types**: Import types from server functions for guaranteed type safety
- **Error Handling**: Built-in error handling with meaningful messages
- **Easy Testing**: Server functions can be tested independently

## Available Functions

### `getProjects()`
Get all projects with summary information including bundle sizes, module counts, and change percentages.

**Returns**: `Promise<Project[]>`

### `getProjectAnalyses(projectName: string)`
Get analysis history for a specific project, ordered by date (newest first).

**Parameters**:
- `projectName`: Name of the project

**Returns**: `Promise<AnalysisRun[]>`

### `getAnalysisDetails(id: string)`
Get detailed information about a specific analysis run.

**Parameters**:
- `id`: Analysis run ID

**Returns**: `Promise<AnalysisRun | null>`

### `getAnalysisModules(id: string, filters?: ModuleFilters)`
Get modules for an analysis with optional filtering, sorting, and pagination.

**Parameters**:
- `id`: Analysis run ID
- `filters`: Optional filters including:
  - `fileType`: Filter by file type
  - `isThirdParty`: Filter by third-party status
  - `packageName`: Filter by package name
  - `search`: Search in file paths
  - `sortBy`: Sort field (filePath, originalSize, bundledSize)
  - `sortOrder`: Sort order (asc, desc)
  - `page`: Page number (1-indexed)
  - `pageSize`: Results per page

**Returns**: `Promise<PaginatedResult<Module>>`

### `getAnalysisBundles(id: string)`
Get all bundles for an analysis, ordered by size (largest first).

**Parameters**:
- `id`: Analysis run ID

**Returns**: `Promise<Bundle[]>`

### `getAnalysisDependencyGraph(id: string)`
Get the dependency graph showing relationships between modules.

**Parameters**:
- `id`: Analysis run ID

**Returns**: `Promise<Map<number, DependencyNode>>`

### `getAnalysisTreemap(id: string)`
Get hierarchical treemap data for visualization, organized by directory structure.

**Parameters**:
- `id`: Analysis run ID

**Returns**: `Promise<TreemapNode>`

## Usage Examples

### Client-Side Usage

```typescript
import * as api from "@/api";

// Get all projects
const projects = await api.getProjects();

// Get analysis history for a project
const analyses = await api.getProjectAnalyses("my-project");

// Get modules with filtering
const modules = await api.getAnalysisModules("123", {
  isThirdParty: false,
  sortBy: "bundledSize",
  sortOrder: "desc",
  page: 1,
  pageSize: 50,
});

// Get bundles
const bundles = await api.getAnalysisBundles("123");

// Get dependency graph
const graph = await api.getAnalysisDependencyGraph("123");

// Get treemap data
const treemap = await api.getAnalysisTreemap("123");
```

### Integration with TanStack Router

```typescript
import { createRoute } from "@tanstack/react-router";
import * as api from "@/api";

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectName",
  loader: async ({ params }) => {
    const analyses = await api.getProjectAnalyses(params.projectName);
    return { analyses };
  },
  component: ProjectPage,
});
```

## Environment Configuration

Create a `.env` file (see `.env.example`) to configure the database:

```env
# Database Configuration
DATABASE_URL=./smappy.db  # or ":memory:" for in-memory database
```

## Running the Server

```bash
# Run API server only
pnpm dev:api

# Run both API server and frontend
pnpm dev:all

# Run frontend only (requires API server running separately)
pnpm dev
```

The API server runs on port 3001 by default. Configure with `PORT` environment variable.

## Error Handling

All server functions include built-in error handling. Errors are returned as:

```typescript
{
  error: "Error type",
  message: "Detailed error message"
}
```

The client wrapper automatically throws errors for failed requests, which can be caught and handled in your components.

## Testing

Server functions can be tested directly without running the API server:

```typescript
import { getProjects, getAnalysisDetails } from "@/server/functions";

describe("Server Functions", () => {
  it("should get all projects", async () => {
    const projects = await getProjects();
    expect(projects).toBeDefined();
  });
});
```
