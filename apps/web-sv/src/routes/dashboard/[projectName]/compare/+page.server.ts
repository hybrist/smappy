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
  const hasEnoughAnalyses = analysisHistory.length >= 2;

  let baseId: number | null = null;
  let compareId: number | null = null;
  let comparison: Awaited<ReturnType<typeof compareAnalyses>> | null = null;

  if (hasEnoughAnalyses) {
    // Get analysis IDs from query parameters
    const baseIdParam = url.searchParams.get('baseId');
    const compareIdParam = url.searchParams.get('compareId');

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
    comparison = await compareAnalyses(baseId, compareId);

    if (!comparison) {
      error(404, 'Analysis runs not found');
    }
  }

  return {
    projectName,
    projects,
    analysisHistory,
    comparison,
    baseId,
    compareId,
    hasEnoughAnalyses,
  };
};
