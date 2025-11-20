import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Github, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function Navbar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2 font-mono font-bold text-xl text-primary hover:opacity-80 transition-opacity"
        >
          <div className="relative w-8 h-8 overflow-hidden rounded-md bg-primary/10 border border-primary/20">
            <img
              src="/crocodile-mascot.png"
              alt="Smappy Mascot"
              className="w-full h-full object-cover"
            />
          </div>
          <span>Smappy</span>
        </Link>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {!isDashboard && (
            <Link to="/dashboard">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                Launch App
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
