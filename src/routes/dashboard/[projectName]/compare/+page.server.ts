import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllProjects, getAnalysisHistory, compareAnalyses } from '$lib/server/query/index.js';

export const load: PageServerLoad = async ({ params, url }) => {
  const projectName = params.projectName;

  if (!projectName) {
    error(400, 'Project name is required');
  }

  // Get all projects for navigation
  const projects = await getAllProjects();

  // Get analysis history for the project
  const analysisHistory = await getAnalysisHistory(projectName);

  if (analysisHistory.length < 2) {
    error(400, 'At least two analysis runs are required for comparison');
  }

  // Get analysis IDs from query parameters
  const baseIdParam = url.searchParams.get('baseId');
  const compareIdParam = url.searchParams.get('compareId');

  let baseId: number;
  let compareId: number;

  if (baseIdParam && compareIdParam) {
    baseId = parseInt(baseIdParam, 10);
    compareId = parseInt(compareIdParam, 10);

    if (isNaN(baseId) || isNaN(compareId)) {
      error(400, 'Invalid analysis IDs');
    }
  } else {
    // Default to comparing the two most recent analyses
    baseId = analysisHistory[1].id; // Older analysis
    compareId = analysisHistory[0].id; // Newer analysis
  }

  // Fetch comparison data
  const comparison = await compareAnalyses(baseId, compareId);

  if (!comparison) {
    error(404, 'Analysis runs not found');
  }

  return {
    projectName,
    projects,
    analysisHistory,
    comparison,
    baseId,
    compareId,
  };
};
