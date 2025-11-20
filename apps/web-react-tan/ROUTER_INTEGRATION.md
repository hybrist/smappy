# Server Functions Integration with TanStack Router

This document provides examples of how to integrate the server functions with TanStack Router loaders for type-safe data fetching.

## Basic Integration

### Simple Route with Loader

```typescript
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router";
import * as api from "@/api";

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  loader: async () => {
    // Call server function
    const projects = await api.getProjects();
    return { projects };
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  // Access loader data with full type safety
  const { projects } = projectsRoute.useLoaderData();

  return (
    <div>
      {projects.map(project => (
        <div key={project.name}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Dynamic Route with Parameters

```typescript
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router";
import * as api from "@/api";

const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis/$analysisId",
  loader: async ({ params }) => {
    // Use route parameters
    const analysis = await api.getAnalysisDetails(params.analysisId);
    return { analysis };
  },
  component: AnalysisPage,
});

function AnalysisPage() {
  const { analysis } = analysisRoute.useLoaderData();

  if (!analysis) {
    return <div>Analysis not found</div>;
  }

  return (
    <div>
      <h1>{analysis.projectName}</h1>
      <p>Size: {analysis.totalSize} bytes</p>
    </div>
  );
}
```

### Route with Multiple Data Sources

```typescript
const analysisDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis/$analysisId/details",
  loader: async ({ params }) => {
    // Fetch multiple data sources in parallel
    const [analysis, bundles, modules, treemap] = await Promise.all([
      api.getAnalysisDetails(params.analysisId),
      api.getAnalysisBundles(params.analysisId),
      api.getAnalysisModules(params.analysisId, {
        page: 1,
        pageSize: 10,
      }),
      api.getAnalysisTreemap(params.analysisId),
    ]);

    return { analysis, bundles, modules, treemap };
  },
  component: AnalysisDetailPage,
});
```

### Route with Search Parameters

```typescript
const modulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis/$analysisId/modules",
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search?.page ?? 1),
    fileType: search?.fileType as string | undefined,
    search: search?.search as string | undefined,
  }),
  loader: async ({ params, search }) => {
    const modules = await api.getAnalysisModules(params.analysisId, {
      page: search.page,
      fileType: search.fileType,
      search: search.search,
      pageSize: 50,
    });

    return { modules };
  },
  component: ModulesPage,
});
```

## Error Handling

```typescript
const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis/$analysisId",
  loader: async ({ params }) => {
    try {
      const analysis = await api.getAnalysisDetails(params.analysisId);

      if (!analysis) {
        throw new Error("Analysis not found");
      }

      return { analysis, error: null };
    } catch (error) {
      return {
        analysis: null,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
  component: AnalysisPage,
});

function AnalysisPage() {
  const { analysis, error } = analysisRoute.useLoaderData();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>{/* render analysis */}</div>;
}
```

## Prefetching Data

```typescript
import { Link } from "@tanstack/react-router";

function ProjectsList() {
  const { projects } = projectsRoute.useLoaderData();

  return (
    <div>
      {projects.map(project => (
        <Link
          key={project.name}
          to="/analysis/$analysisId"
          params={{ analysisId: String(project.id) }}
          // Prefetch on hover
          preload="intent"
        >
          {project.name}
        </Link>
      ))}
    </div>
  );
}
```

## Optimistic Updates

```typescript
import { useRouter } from "@tanstack/react-router";

function ProjectActions({ projectName }: { projectName: string }) {
  const router = useRouter();

  const handleRefresh = async () => {
    // Trigger a refresh of the current route's loader
    await router.invalidate();
  };

  return (
    <button onClick={handleRefresh}>
      Refresh Data
    </button>
  );
}
```

## Complete Example

Here's a complete example showing a project detail page with navigation:

```typescript
import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "@/router";
import * as api from "@/api";

// Project detail route
const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectName",
  loader: async ({ params }) => {
    const [analyses] = await Promise.all([
      api.getProjectAnalyses(params.projectName),
    ]);

    return { projectName: params.projectName, analyses };
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { projectName, analyses } = projectRoute.useLoaderData();

  return (
    <div>
      <h1>Project: {projectName}</h1>

      <div>
        <h2>Analysis History</h2>
        {analyses.map(analysis => (
          <Link
            key={analysis.id}
            to="/analysis/$analysisId"
            params={{ analysisId: String(analysis.id) }}
            preload="intent"
          >
            <div>
              <div>{new Date(analysis.createdAt).toLocaleDateString()}</div>
              <div>Size: {(analysis.totalSize / 1024).toFixed(2)} KB</div>
              <div>Modules: {analysis.moduleCount}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Register route
// Add to router.tsx:
// const routeTree = rootRoute.addChildren([
//   indexRoute,
//   dashboardRoute,
//   projectRoute
// ]);
```

## Best Practices

1. **Type Safety**: Always import types from the API client for type-safe data access
2. **Error Handling**: Handle errors gracefully in loaders and components
3. **Loading States**: Use TanStack Router's built-in loading states
4. **Parallel Fetching**: Use `Promise.all()` when fetching multiple data sources
5. **Prefetching**: Use `preload="intent"` on links for better UX
6. **Caching**: TanStack Router automatically caches loader data

## Performance Tips

1. **Pagination**: Always paginate large datasets
2. **Lazy Loading**: Only load data when needed
3. **Suspense**: Use React Suspense for better loading UX
4. **Parallel Requests**: Fetch independent data in parallel
5. **Memoization**: Use React.memo for expensive components

## Testing

```typescript
import { describe, it, expect, vi } from "vitest";
import * as api from "@/api";

describe("Route Loaders", () => {
  it("should load projects", async () => {
    const mockProjects = [{ name: "test-project", totalSize: 1000 }];

    vi.spyOn(api, "getProjects").mockResolvedValue(mockProjects);

    const loader = projectsRoute.options.loader;
    const result = await loader({ params: {} });

    expect(result.projects).toEqual(mockProjects);
  });
});
```
