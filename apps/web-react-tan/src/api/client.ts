/**
 * Client-side API wrapper for server functions
 * Provides type-safe client-side functions that call server endpoints
 *
 * Import types from server to ensure end-to-end type safety
 */

import type {
  Project,
  AnalysisRun,
  Module,
  ModuleFilters,
  PaginatedResult,
  Bundle,
  DependencyNode,
  TreemapNode,
} from "../server/functions";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Unknown error",
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get all projects with summary information
 */
export async function getProjects(): Promise<Project[]> {
  return fetchAPI<Project[]>("/api/projects");
}

/**
 * Get analysis history for a specific project
 */
export async function getProjectAnalyses(
  projectName: string,
): Promise<AnalysisRun[]> {
  return fetchAPI<AnalysisRun[]>(
    `/api/projects/${encodeURIComponent(projectName)}/analyses`,
  );
}

/**
 * Get detailed information about a specific analysis
 */
export async function getAnalysisDetails(
  id: string,
): Promise<AnalysisRun | null> {
  return fetchAPI<AnalysisRun | null>(`/api/analyses/${id}`);
}

/**
 * Get modules for an analysis with optional filtering
 */
export async function getAnalysisModules(
  id: string,
  filters?: ModuleFilters,
): Promise<PaginatedResult<Module>> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.fileType) params.append("fileType", filters.fileType);
    if (filters.isThirdParty !== undefined)
      params.append("isThirdParty", String(filters.isThirdParty));
    if (filters.packageName) params.append("packageName", filters.packageName);
    if (filters.search) params.append("search", filters.search);
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.pageSize) params.append("pageSize", String(filters.pageSize));
  }

  const query = params.toString();
  const endpoint = `/api/analyses/${id}/modules${query ? `?${query}` : ""}`;

  return fetchAPI<PaginatedResult<Module>>(endpoint);
}

/**
 * Get bundles for an analysis
 */
export async function getAnalysisBundles(id: string): Promise<Bundle[]> {
  return fetchAPI<Bundle[]>(`/api/analyses/${id}/bundles`);
}

/**
 * Get dependency graph for an analysis
 */
export async function getAnalysisDependencyGraph(
  id: string,
): Promise<DependencyNode[]> {
  return fetchAPI<DependencyNode[]>(`/api/analyses/${id}/dependency-graph`);
}

/**
 * Get treemap data for an analysis
 */
export async function getAnalysisTreemap(id: string): Promise<TreemapNode> {
  return fetchAPI<TreemapNode>(`/api/analyses/${id}/treemap`);
}
