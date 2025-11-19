import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  LayoutDashboard,
  Share2,
  Settings,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Package,
  Database,
  Zap,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RawModulesView } from "@/components/raw-modules-view";

// Mock Data
const bundleData = [
  { name: "react-dom", value: 450, color: "hsl(var(--chart-1))" },
  { name: "lodash", value: 300, color: "hsl(var(--chart-2))" },
  { name: "moment", value: 200, color: "hsl(var(--chart-3))" },
  { name: "core-js", value: 150, color: "hsl(var(--chart-4))" },
  { name: "others", value: 100, color: "hsl(var(--chart-5))" },
];

const suggestions = [
  {
    id: 1,
    type: "critical",
    title: "Large Dependency Detected",
    description: "Moment.js is 200KB. Consider replacing with date-fns (20KB).",
  },
  {
    id: 2,
    type: "warning",
    title: "Duplicate Packages",
    description: "Found 2 versions of lodash bundled.",
  },
  {
    id: 3,
    type: "info",
    title: "Tree Shaking Opportunity",
    description: "25% of @radix-ui/icons is unused.",
  },
];

const savedChats = [
  { id: 1, title: "Optimizing moment.js", date: "2h ago" },
  { id: 2, title: "Tree shaking lodash", date: "Yesterday" },
  { id: 3, title: "Bundle size regression", date: "2 days ago" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    if (activeTab === "raw-modules") {
      return <RawModulesView />;
    }

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bundle Overview
            </h1>
            <p className="text-muted-foreground">
              Analysis for{" "}
              <span className="font-mono text-primary">app.min.js</span>
            </p>
          </div>
          <Button>
            <ArrowUpRight className="mr-2 w-4 h-4" /> Export Report
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bundle Size
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2 MB</div>
              <p className="text-xs text-muted-foreground">
                +20% from last build
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Parse Time</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">340ms</div>
              <p className="text-xs text-muted-foreground">
                Estimated on mid-range device
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Optimization Score
              </CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">72/100</div>
              <p className="text-xs text-muted-foreground">
                3 critical issues found
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Visualization & AI Chat */}
        <div className="grid gap-4 md:grid-cols-7">
          {/* Left: Charts */}
          <Card className="md:col-span-4 lg:col-span-5">
            <CardHeader>
              <CardTitle>Module Composition</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bundleData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {bundleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Right: AI Suggestions */}
          <Card className="md:col-span-3 lg:col-span-2 flex flex-col bg-gradient-to-b from-card to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Mascot className="w-8 h-8" />
                <CardTitle className="text-base">Smappy Suggestions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2">
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors text-sm space-y-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm",
                          suggestion.type === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : suggestion.type === "warning"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-blue-500/10 text-blue-600",
                        )}
                      >
                        {suggestion.type}
                      </span>
                    </div>
                    <p className="font-medium leading-tight">
                      {suggestion.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {suggestion.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="bg-card border rounded-lg p-2 shadow-inner">
                  <p className="text-xs text-muted-foreground mb-2 italic">
                    Ask Smappy about your bundle...
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a question..."
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                variant={activeTab === "import-graph" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === "import-graph" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
                onClick={() => setActiveTab("import-graph")}
              >
                <Share2 className="mr-2 w-4 h-4" /> Import Graph
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

          <div className="p-4 mt-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Saved Chats
            </h2>
            <nav className="space-y-1">
              {savedChats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-2 text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="mr-2 w-4 h-4 shrink-0" />
                  <div className="flex flex-col items-start text-left overflow-hidden">
                    <span className="truncate w-full text-sm font-medium">
                      {chat.title}
                    </span>
                    <span className="text-[10px] opacity-70">{chat.date}</span>
                  </div>
                </Button>
              ))}
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
