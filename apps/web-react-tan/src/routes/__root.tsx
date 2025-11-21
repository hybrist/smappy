import {
  createRootRoute,
  Outlet,
  ScrollRestoration,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import "@/app.css";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="smappy-ui-theme">
      <Outlet />
      <ScrollRestoration />
    </ThemeProvider>
  ),
});
