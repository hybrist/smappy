import { getProjectAnalyses } from "@/api";
import { Navbar } from "@/components/layout/navbar";
import {
  createFileRoute,
  useLoaderData,
  useParams,
} from "@tanstack/react-router";

export const Route = createFileRoute("/analyses/$analysisId")({
  component: AnalysisDetailsPage,
  loader: ({ params: { projectName } }) => getProjectAnalyses(projectName),
});

function AnalysisDetailsPage() {
  const analysis = useLoaderData({ from: "/analyses/$analysisId" });
  const { analysisId } = useParams({ from: "/analyses/$analysisId" });

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Analysis Details for #{analysisId}
              </h1>
              <p className="text-muted-foreground">
                {analysis.projectName} -{" "}
                {new Date(analysis.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <pre>{JSON.stringify(analysis, null, 2)}</pre>
        </div>
      </main>
    </div>
  );
}
