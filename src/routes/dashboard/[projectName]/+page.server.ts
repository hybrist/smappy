import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  getAllProjects,
  getAnalysisHistory,
  getLatestAnalysis,
  getAnalysisById,
  getBundlesByAnalysis,
  getBundleBreakdownByFileType,
  getChunksByAnalysis,
  getModulesByAnalysis,
  type Bundle,
  type Chunk,
  type Module,
} from '$lib/server/query/index.js';

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

  // Fetch bundle overview data if analysis exists
  let bundles: Bundle[] = [];
  let bundleBreakdown = new Map<
    string,
    { count: number; totalSize: number; totalGzipSize: number }
  >();
  let chunks: Chunk[] = [];
  let topModules: Module[] = [];
  let modulesData: { items: Module[] } | null = null;

  if (analysis) {
    try {
      [bundles, bundleBreakdown, chunks, modulesData] = await Promise.all([
        getBundlesByAnalysis(analysis.id),
        getBundleBreakdownByFileType(analysis.id),
        getChunksByAnalysis(analysis.id),
        getModulesByAnalysis(analysis.id, {
          sortBy: 'bundledSize',
          sortOrder: 'desc',
          pageSize: 10, // Top 10 largest modules
        }),
      ]);
      topModules = modulesData.items;
    } catch (error) {
      console.error('Error fetching bundle overview data:', error);
      // Continue with empty data
    }
  }

  return {
    projectName,
    projects,
    analysisHistory,
    selectedAnalysisId,
    analysis,
    bundles: bundles.map((b) => ({
      ...b,
      gzipSize: b.gzipSize ?? null,
    })),
    bundleBreakdown: Object.fromEntries(bundleBreakdown),
    chunks,
    topModules,
  };
};
