import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useLoaderData, useParams } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export default function ProjectAnalysesPage() {
  const analyses = useLoaderData({ from: "/projects/$projectName" });
  const { projectName } = useParams({ from: "/projects/$projectName" });

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Analyses for {projectName}
              </h1>
              <p className="text-muted-foreground">
                A list of your project's analyses.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle>Analysis #{analysis.id}</CardTitle>
                  <CardDescription>
                    {new Date(analysis.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={`/analyses/${analysis.id}`}>
                    <Button>View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
