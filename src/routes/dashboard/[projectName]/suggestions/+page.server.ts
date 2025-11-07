import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSuggestionsByAnalysis } from '$lib/query/data.remote';
import type { SuggestionWithLinks } from '$lib/server/query/types';
import { getAllProjects, getAnalysisHistory, getLatestAnalysis } from '$lib/server/query/index.js';

export const load: PageServerLoad = async ({ params, url }) => {
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
        // Find analysis in history
        analysis = analysisHistory.find((a) => a.id === id);
        if (!analysis) {
          selectedAnalysisId = null;
        }
      } catch {
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
      analysis = null;
    }
  }

  // Fetch suggestions data if analysis exists
  let suggestions: SuggestionWithLinks[] = [];
  if (analysis) {
    try {
      const result = await getSuggestionsByAnalysis({ analysisId: analysis.id, options: {} });
      suggestions = result.data;
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  }

  return {
    projectName,
    projects,
    analysisHistory,
    selectedAnalysisId,
    analysis,
    suggestions,
  };
};
