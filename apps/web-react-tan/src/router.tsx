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

// Export rootRoute for use in other route files
export const rootRoute = createRootRoute({
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

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute]);

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
