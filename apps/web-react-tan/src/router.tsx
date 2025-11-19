import { createRouter as createTanStackRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { Outlet, ScrollRestoration } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import '@/app.css'

// Import page components
import HomePage from '@/routes/index'
import DashboardPage from '@/routes/dashboard'

const rootRoute = createRootRoute({
  component: () => (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Smappy - Bundle Analyzer</title>
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="smappy-ui-theme">
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
      </body>
    </html>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute])

export function createRouter() {
  return createTanStackRouter({
    routeTree,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

