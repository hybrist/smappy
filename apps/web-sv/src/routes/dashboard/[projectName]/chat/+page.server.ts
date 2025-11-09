import { getLatestAnalysis } from '$lib/server/query/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { projectName } = params;

  try {
    const analysis = await getLatestAnalysis(projectName);

    return {
      projectName,
      analysis,
    };
  } catch (error) {
    console.error('Failed to load analysis:', error);
    return {
      projectName,
      analysis: null,
      error: error instanceof Error ? error.message : 'Failed to load analysis',
    };
  }
};
