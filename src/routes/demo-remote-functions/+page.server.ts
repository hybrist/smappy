/**
 * Server-side example demonstrating remote query functions usage
 * This file shows how to use remote functions from server-side code
 */

import { getLatestAnalysis, getModulesByAnalysis } from '$lib/query/data.remote';

export async function load() {
  // Example: Load latest analysis for a project
  try {
    const analysis = await getLatestAnalysis('test-project');
    const modules = await getModulesByAnalysis({
      analysisId: analysis.id,
      options: { limit: 10 },
    });

    return {
      analysis,
      modules,
    };
  } catch (error) {
    // Handle errors gracefully
    return {
      analysis: null,
      modules: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
