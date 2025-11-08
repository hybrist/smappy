import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllProjects, getAnalysisHistory, getLatestAnalysis } from '$lib/server/query/index.js';
import { getDependencyGraph } from '$lib/query/data.remote';
import { analyzeDependencyCycles } from '$lib/utils/dependency-graph.js';
import type { DependencyGraph } from '$lib/server/query/types.js';

export const load: PageServerLoad = async ({ params, url }) => {
  const projectName = params.projectName;

  if (!projectName) {
    error(400, 'Project name is required');
  }

  const projects = await getAllProjects();
  const analysisHistory = await getAnalysisHistory(projectName);

  const analysisIdParam = url.searchParams.get('analysisId');
  let selectedAnalysisId: number | null = null;
  let analysis = null;

  if (analysisIdParam) {
    const parsed = parseInt(analysisIdParam, 10);
    if (!Number.isNaN(parsed)) {
      selectedAnalysisId = parsed;
      analysis = analysisHistory.find((entry) => entry.id === parsed) ?? null;
      if (!analysis) {
        selectedAnalysisId = null;
      }
    }
  }

  if (!analysis && analysisHistory.length > 0) {
    selectedAnalysisId = analysisHistory[0].id;
    try {
      analysis = await getLatestAnalysis(projectName);
    } catch (err) {
      console.error('Failed to load latest analysis', err);
      analysis = null;
    }
  }

  let dependencyGraph: DependencyGraph | null = null;
  let cycleAnalysis = null;
  let graphStats: {
    nodeCount: number;
    edgeCount: number;
    cycleCount: number;
    circularModuleCount: number;
  } | null = null;

  if (analysis) {
    try {
      dependencyGraph = await getDependencyGraph(analysis.id);
      cycleAnalysis = analyzeDependencyCycles(dependencyGraph);
      graphStats = {
        nodeCount: dependencyGraph.nodes.length,
        edgeCount: dependencyGraph.edges.length,
        cycleCount: cycleAnalysis.cycles.length,
        circularModuleCount: cycleAnalysis.cycleNodeIds.length,
      };
    } catch (err) {
      console.error('Error fetching dependency graph', err);
    }
  }

  return {
    projectName,
    projects,
    analysisHistory,
    selectedAnalysisId,
    analysis,
    dependencyGraph,
    cycleAnalysis,
    graphStats,
  };
};
