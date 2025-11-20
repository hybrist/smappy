/**
 * Projects List Route
 * Example of TanStack Router integration with server functions
 */

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@/router";
import * as api from "@/api";
import type { Project } from "@/server/functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";

// Define the route with loader
export const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  loader: async () => {
    // Call server function to get projects
    const projects = await api.getProjects();
    return { projects };
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  // Access loader data with explicit type
  const { projects } = projectsRoute.useLoaderData() as { projects: Project[] };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            All analyzed projects with their latest bundle sizes
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.name}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bundle Size:</span>
                    <span className="font-medium">
                      {project.totalSize
                        ? `${(project.totalSize / 1024).toFixed(2)} KB`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modules:</span>
                    <span className="font-medium">
                      {project.moduleCount ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bundler:</span>
                    <span className="font-medium">
                      {project.bundler ?? "Unknown"}
                    </span>
                  </div>
                  {project.changePercent !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change:</span>
                      <span
                        className={`font-medium ${
                          project.changePercent > 0
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {project.changePercent > 0 ? "+" : ""}
                        {project.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="pt-2 text-xs text-muted-foreground">
                    Last analyzed:{" "}
                    {project.lastAnalyzedAt
                      ? new Date(project.lastAnalyzedAt).toLocaleDateString()
                      : "Never"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
