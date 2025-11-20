import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LayoutDashboard, Bot, Package, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { RawModulesView } from "@/components/raw-modules-view";
import { Link, useLoaderData } from "@tanstack/react-router";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const projects = useLoaderData({ from: "/dashboard" });

  const renderContent = () => {
    if (activeTab === "raw-modules") {
      return <RawModulesView />;
    }

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">A list of your projects.</p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {projects.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <LayoutDashboard className="w-12 h-12 mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No projects found</h2>
              <p className="mb-4">
                You don't have any projects yet. Create a new project to get
                started.
              </p>
            </div>
          ) : (
            projects.map(
              (project: {
                projectName: string;
                totalRuns: number;
                latestRunDate: string | null;
              }) => (
                <Card key={project.projectName}>
                  <CardHeader>
                    <CardTitle>{project.projectName}</CardTitle>
                    <CardDescription>
                      {project.totalRuns} analyses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link
                      to="/projects/$projectName"
                      params={{ projectName: project.projectName }}
                    >
                      <Button>View Analyses</Button>
                    </Link>
                  </CardContent>
                </Card>
              ),
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-sidebar hidden md:flex flex-col">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Analysis Tools
            </h2>
            <nav className="space-y-1">
              <Button
                variant={activeTab === "overview" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === "overview" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
                onClick={() => setActiveTab("overview")}
              >
                <LayoutDashboard className="mr-2 w-4 h-4" /> Overview
              </Button>
              <Button
                variant={activeTab === "raw-modules" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === "raw-modules" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
                onClick={() => setActiveTab("raw-modules")}
              >
                <Database className="mr-2 w-4 h-4" /> Raw Modules
              </Button>
              <Button
                variant={activeTab === "dependencies" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === "dependencies" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
                onClick={() => setActiveTab("dependencies")}
              >
                <Package className="mr-2 w-4 h-4" /> Dependencies
              </Button>
            </nav>
          </div>

          <div className="mt-auto p-4 border-t bg-sidebar-accent/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Assistant</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
