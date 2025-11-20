/**
 * Analysis Detail Route
 * Example of TanStack Router integration with server functions for dynamic routes
 */

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router";
import * as api from "@/api";
import type {
  AnalysisRun,
  Bundle,
  Module,
  PaginatedResult,
} from "@/server/functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";

type LoaderData = {
  analysis: AnalysisRun | null;
  bundles: Bundle[];
  modules: PaginatedResult<Module>;
};

// Define the route with loader
export const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis/$analysisId",
  loader: async ({ params }) => {
    // Call server functions to get analysis data
    const [analysis, bundles, modules] = await Promise.all([
      api.getAnalysisDetails(params.analysisId),
      api.getAnalysisBundles(params.analysisId),
      api.getAnalysisModules(params.analysisId, {
        page: 1,
        pageSize: 20,
        sortBy: "bundledSize",
        sortOrder: "desc",
      }),
    ]);

    return { analysis, bundles, modules };
  },
  component: AnalysisPage,
});

function AnalysisPage() {
  // Access loader data with explicit type
  const { analysis, bundles, modules } =
    analysisRoute.useLoaderData() as LoaderData;

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Analysis Not Found</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{analysis.projectName}</h1>
          <p className="text-muted-foreground">
            Analysis from {new Date(analysis.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((analysis.totalSize ?? 0) / 1024).toFixed(2)} KB
              </div>
              <p className="text-xs text-muted-foreground">
                Gzipped: {((analysis.totalGzipSize ?? 0) / 1024).toFixed(2)} KB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.moduleCount}</div>
              <p className="text-xs text-muted-foreground">Total modules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bundles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.bundleCount}</div>
              <p className="text-xs text-muted-foreground">
                Bundler: {analysis.bundler ?? "Unknown"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bundles Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bundles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium font-mono text-sm">
                      {bundle.fileName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bundle.fileType}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {(bundle.size / 1024).toFixed(2)} KB
                    </div>
                    {bundle.gzipSize && (
                      <div className="text-xs text-muted-foreground">
                        gzip: {(bundle.gzipSize / 1024).toFixed(2)} KB
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modules Section */}
        <Card>
          <CardHeader>
            <CardTitle>Top Modules by Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modules.items.map((module) => (
                <div
                  key={module.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium font-mono text-sm truncate">
                      {module.filePath}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{module.fileType}</span>
                      {module.isThirdParty && (
                        <span className="text-blue-500">
                          Third Party: {module.packageName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold">
                      {(module.bundledSize / 1024).toFixed(2)} KB
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Original: {(module.originalSize / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {modules.items.length} of {modules.total} modules (page{" "}
                {modules.page} of {modules.totalPages})
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
