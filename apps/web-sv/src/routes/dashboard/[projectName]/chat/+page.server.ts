import { getLatestAnalysis } from '$lib/query/data.remote';

export async function load({ params }) {
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
}
