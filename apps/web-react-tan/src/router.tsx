import {
  createRouter as createTanStackRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { Outlet, ScrollRestoration } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import "@/app.css";

// Import page components
import HomePage from "@/routes/index";
import DashboardPage from "@/routes/dashboard";

const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="smappy-ui-theme">
      <Outlet />
      <ScrollRestoration />
    </ThemeProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

import {
  getProjects,
  getProjectAnalyses,
  getAnalysisDetails,
} from "@/api";
import AnalysisDetailsPage from "@/routes/analyses.$analysisId";

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
  loader: () => getProjects(),
});

import ProjectAnalysesPage from "@/routes/projects.$projectName";

const projectAnalysesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectName",
  component: ProjectAnalysesPage,
  loader: ({ params: { projectName } }) => getProjectAnalyses(projectName),
});

const analysisDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analyses/$analysisId",
  component: AnalysisDetailsPage,
  loader: ({ params: { analysisId } }) => getAnalysisDetails(analysisId),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  projectAnalysesRoute,
  analysisDetailsRoute,
]);

export function createRouter() {
  return createTanStackRouter({
    routeTree,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
