import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import {
  getAllProjects,
  getAnalysisHistory,
  getLatestAnalysis,
  getAnalysisById,
} from '$lib/server/query/index.js';

export const load: ServerLoad = async ({ params, url }) => {
  const projectName = params.projectName;

  if (!projectName) {
    error(400, 'Project name is required');
  }

  // Get all projects for the selector
  const projects = await getAllProjects();

  // Get analysis history for the project
  const analysisHistory = await getAnalysisHistory(projectName);

  // Get selected analysis ID from query parameter, or use latest
  const analysisIdParam = url.searchParams.get('analysisId');
  let selectedAnalysisId: number | null = null;
  let analysis = null;

  if (analysisIdParam) {
    const id = parseInt(analysisIdParam, 10);
    if (!isNaN(id)) {
      selectedAnalysisId = id;
      try {
        analysis = await getAnalysisById(id);
      } catch {
        // If analysis not found, fall back to latest
        selectedAnalysisId = null;
      }
    }
  }

  // If no specific analysis selected, get the latest
  if (!analysis && analysisHistory.length > 0) {
    selectedAnalysisId = analysisHistory[0].id;
    try {
      analysis = await getLatestAnalysis(projectName);
    } catch {
      // Project exists but no analysis found
      analysis = null;
    }
  }

  return {
    projectName,
    projects,
    analysisHistory,
    selectedAnalysisId,
    analysis,
  };
};
