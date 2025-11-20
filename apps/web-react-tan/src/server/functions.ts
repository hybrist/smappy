/**
 * Server Functions for Bundle Analysis Data Access
 * Type-safe server-side functions that can be called from client-side code
 * 
 * These functions provide direct database access with full TypeScript support,
 * eliminating the need for a traditional REST API layer.
 */

import { db } from "./db";
import { schema } from "@smappy/store";
import { eq, desc, asc, and, like, sql } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface Project {
  name: string;
  bundler: string | null;
  moduleCount: number | null;
  bundleCount: number | null;
  totalSize: number | null;
  totalGzipSize: number | null;
  lastAnalyzedAt: string | null;
  changePercent: number | null;
  isStale: boolean;
}

export interface AnalysisRun {
  id: number;
  projectName: string | null;
  createdAt: string;
  bundler: string | null;
  moduleCount?: number;
  bundleCount?: number;
  totalSize?: number;
  totalGzipSize?: number;
}

export interface Module {
  id: number;
  analysisRunId: number;
  filePath: string;
  fileType: string;
  originalSize: number;
  bundledSize: number;
  isThirdParty: boolean;
  packageName: string | null;
  packageVersion: string | null;
  exports: string[] | null;
  usedExports: string[] | null;
}

export interface ModuleFilters {
  fileType?: string;
  isThirdParty?: boolean;
  packageName?: string;
  search?: string;
  sortBy?: "filePath" | "originalSize" | "bundledSize";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Bundle {
  id: number;
  analysisRunId: number;
  fileName: string;
  fileType: string;
  size: number;
  gzipSize: number | null;
}

export interface DependencyNode {
  moduleId: number;
  filePath: string;
  dependencies: DependencyEdge[];
  dependents: DependencyEdge[];
}

export interface DependencyEdge {
  targetModuleId: number;
  targetPath: string;
  importType: "static" | "dynamic";
  importedSymbols: string[] | null;
}

export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  moduleId?: number;
  symbolId?: number;
  fileType?: string;
  isThirdParty?: boolean;
  packageName?: string | null;
  filePath?: string;
  originalSize?: number;
  bundledSize?: number;
  gzipSize?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely parse JSON string, returning null on error
 */
function safeJsonParse<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get all projects with summary information
 * @returns Array of project summaries
 */
export async function getProjects(): Promise<Project[]> {
  // Get all unique project names
  const projects = await db
    .select({ projectName: schema.analysisRun.projectName })
    .from(schema.analysisRun)
    .where(sql`${schema.analysisRun.projectName} IS NOT NULL`);

  const uniqueProjects = [
    ...new Set(projects.map((p) => p.projectName).filter(Boolean)),
  ] as string[];

  const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

  // Get summary for each project
  const summaries = await Promise.all(
    uniqueProjects.map(async (projectName) => {
      const latestRuns = await db
        .select({
          id: schema.analysisRun.id,
          createdAt: schema.analysisRun.createdAt,
          bundler: schema.analysisRun.bundler,
        })
        .from(schema.analysisRun)
        .where(eq(schema.analysisRun.projectName, projectName))
        .orderBy(
          desc(schema.analysisRun.createdAt),
          desc(schema.analysisRun.id),
        )
        .limit(2);

      if (latestRuns.length === 0) {
        return {
          name: projectName,
          bundler: null,
          moduleCount: null,
          bundleCount: null,
          totalSize: null,
          totalGzipSize: null,
          lastAnalyzedAt: null,
          changePercent: null,
          isStale: false,
        };
      }

      const [latestRunRecord, previousRunRecord] = latestRuns;
      const latestRun = await getAnalysisById(latestRunRecord.id);
      const previousRun = previousRunRecord
        ? await getAnalysisById(previousRunRecord.id)
        : null;

      const latestTotalSize = latestRun?.totalSize ?? null;
      const previousTotalSize = previousRun?.totalSize ?? null;

      let changePercent: number | null = null;
      if (
        latestTotalSize !== null &&
        previousTotalSize !== null &&
        previousTotalSize > 0 &&
        latestTotalSize !== previousTotalSize
      ) {
        changePercent =
          ((latestTotalSize - previousTotalSize) / previousTotalSize) * 100;
      }

      const lastAnalyzedAt =
        latestRun?.createdAt ?? latestRunRecord.createdAt ?? null;

      const isStale =
        lastAnalyzedAt !== null
          ? Date.now() - new Date(lastAnalyzedAt).getTime() >
            STALE_THRESHOLD_MS
          : false;

      return {
        name: projectName,
        bundler: latestRun?.bundler ?? latestRunRecord.bundler ?? null,
        moduleCount: latestRun?.moduleCount ?? null,
        bundleCount: latestRun?.bundleCount ?? null,
        totalSize: latestTotalSize,
        totalGzipSize: latestRun?.totalGzipSize ?? null,
        lastAnalyzedAt,
        changePercent,
        isStale,
      };
    }),
  );

  return summaries.sort((a, b) => {
    if (a.lastAnalyzedAt === b.lastAnalyzedAt) {
      return a.name.localeCompare(b.name);
    }
    if (a.lastAnalyzedAt === null) return 1;
    if (b.lastAnalyzedAt === null) return -1;
    return (
      new Date(b.lastAnalyzedAt).getTime() -
      new Date(a.lastAnalyzedAt).getTime()
    );
  });
}

/**
 * Get analysis history for a specific project
 * @param projectName - Name of the project
 * @returns Array of analysis runs ordered by date (newest first)
 */
export async function getProjectAnalyses(
  projectName: string,
): Promise<AnalysisRun[]> {
  const runs = await db
    .select({
      id: schema.analysisRun.id,
      projectName: schema.analysisRun.projectName,
      createdAt: schema.analysisRun.createdAt,
      bundler: schema.analysisRun.bundler,
    })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.projectName, projectName))
    .orderBy(desc(schema.analysisRun.createdAt), desc(schema.analysisRun.id));

  // Get aggregated statistics for each run
  const runsWithStats = await Promise.all(
    runs.map(async (run) => {
      const [moduleStats, bundleStats] = await Promise.all([
        db
          .select({
            moduleCount: sql<number>`count(*)`.as("moduleCount"),
          })
          .from(schema.module)
          .where(eq(schema.module.analysisRunId, run.id)),
        db
          .select({
            bundleCount: sql<number>`count(*)`.as("bundleCount"),
            totalSize: sql<number>`sum(${schema.bundle.size})`.as("totalSize"),
            totalGzipSize:
              sql<number>`sum(${schema.bundle.gzipSize})`.as("totalGzipSize"),
          })
          .from(schema.bundle)
          .where(eq(schema.bundle.analysisRunId, run.id)),
      ]);

      const moduleStat = moduleStats[0];
      const bundleStat = bundleStats[0];

      return {
        id: run.id,
        projectName: run.projectName,
        createdAt: run.createdAt,
        bundler: run.bundler,
        moduleCount: moduleStat?.moduleCount ?? 0,
        bundleCount: bundleStat?.bundleCount ?? 0,
        totalSize: bundleStat?.totalSize ?? 0,
        totalGzipSize: bundleStat?.totalGzipSize ?? 0,
      };
    }),
  );

  return runsWithStats;
}

/**
 * Get detailed information about a specific analysis run
 * @param id - Analysis run ID (as string for URL compatibility)
 * @returns Analysis run details or null if not found
 */
export async function getAnalysisDetails(
  id: string,
): Promise<AnalysisRun | null> {
  const analysisId = parseInt(id, 10);
  if (isNaN(analysisId)) {
    return null;
  }

  return getAnalysisById(analysisId);
}

/**
 * Helper function to get analysis by ID
 */
async function getAnalysisById(id: number): Promise<AnalysisRun | null> {
  const runs = await db
    .select({
      id: schema.analysisRun.id,
      projectName: schema.analysisRun.projectName,
      createdAt: schema.analysisRun.createdAt,
      bundler: schema.analysisRun.bundler,
    })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.id, id))
    .limit(1);

  if (runs.length === 0) {
    return null;
  }

  const run = runs[0];

  // Get aggregated statistics
  const [moduleStats, bundleStats] = await Promise.all([
    db
      .select({
        moduleCount: sql<number>`count(*)`.as("moduleCount"),
      })
      .from(schema.module)
      .where(eq(schema.module.analysisRunId, id)),
    db
      .select({
        bundleCount: sql<number>`count(*)`.as("bundleCount"),
        totalSize: sql<number>`sum(${schema.bundle.size})`.as("totalSize"),
        totalGzipSize:
          sql<number>`sum(${schema.bundle.gzipSize})`.as("totalGzipSize"),
      })
      .from(schema.bundle)
      .where(eq(schema.bundle.analysisRunId, id)),
  ]);

  const moduleStat = moduleStats[0];
  const bundleStat = bundleStats[0];

  return {
    id: run.id,
    projectName: run.projectName,
    createdAt: run.createdAt,
    bundler: run.bundler,
    moduleCount: moduleStat?.moduleCount ?? 0,
    bundleCount: bundleStat?.bundleCount ?? 0,
    totalSize: bundleStat?.totalSize ?? 0,
    totalGzipSize: bundleStat?.totalGzipSize ?? 0,
  };
}

/**
 * Get modules for an analysis with optional filtering and pagination
 * @param id - Analysis run ID (as string for URL compatibility)
 * @param filters - Optional filters for modules
 * @returns Paginated module list
 */
export async function getAnalysisModules(
  id: string,
  filters?: ModuleFilters,
): Promise<PaginatedResult<Module>> {
  const analysisId = parseInt(id, 10);
  if (isNaN(analysisId)) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    };
  }

  const {
    fileType,
    isThirdParty,
    packageName,
    search,
    sortBy = "filePath",
    sortOrder = "asc",
    page: rawPage = 1,
    pageSize: rawPageSize = 50,
  } = filters || {};

  // Validate page and pageSize to prevent negative or unreasonably large values
  const page = Math.max(1, rawPage);
  const pageSize = Math.min(Math.max(1, rawPageSize), 1000);

  // Build where conditions
  const conditions = [eq(schema.module.analysisRunId, analysisId)];

  if (fileType) {
    conditions.push(eq(schema.module.fileType, fileType));
  }

  if (isThirdParty !== undefined) {
    conditions.push(eq(schema.module.isThirdParty, isThirdParty));
  }

  if (packageName) {
    conditions.push(eq(schema.module.packageName, packageName));
  }

  if (search) {
    conditions.push(like(schema.module.filePath, `%${search}%`));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.module)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  // Build order by
  const sortField =
    sortBy === "originalSize"
      ? schema.module.originalSize
      : sortBy === "bundledSize"
        ? schema.module.bundledSize
        : schema.module.filePath;

  const orderByClause = sortOrder === "desc" ? desc(sortField) : asc(sortField);

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const modules = await db
    .select({
      id: schema.module.id,
      analysisRunId: schema.module.analysisRunId,
      filePath: schema.module.filePath,
      fileType: schema.module.fileType,
      originalSize: schema.module.originalSize,
      bundledSize: schema.module.bundledSize,
      isThirdParty: schema.module.isThirdParty,
      packageName: schema.module.packageName,
      packageVersion: schema.module.packageVersion,
      exports: schema.module.exports,
      usedExports: schema.module.usedExports,
    })
    .from(schema.module)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Parse JSON fields
  const parsedModules: Module[] = modules.map((m) => ({
    ...m,
    exports: safeJsonParse<string[]>(m.exports),
    usedExports: safeJsonParse<string[]>(m.usedExports),
  }));

  return {
    items: parsedModules,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get bundles for an analysis
 * @param id - Analysis run ID (as string for URL compatibility)
 * @returns Array of bundles ordered by size (largest first)
 */
export async function getAnalysisBundles(id: string): Promise<Bundle[]> {
  const analysisId = parseInt(id, 10);
  if (isNaN(analysisId)) {
    return [];
  }

  const bundles = await db
    .select({
      id: schema.bundle.id,
      analysisRunId: schema.bundle.analysisRunId,
      fileName: schema.bundle.fileName,
      fileType: schema.bundle.fileType,
      size: schema.bundle.size,
      gzipSize: schema.bundle.gzipSize,
    })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, analysisId))
    .orderBy(desc(schema.bundle.size));

  return bundles;
}

/**
 * Get dependency graph for an analysis
 * @param id - Analysis run ID (as string for URL compatibility)
 * @returns Map of module ID to dependency node
 */
export async function getAnalysisDependencyGraph(
  id: string,
): Promise<Map<number, DependencyNode>> {
  const analysisId = parseInt(id, 10);
  if (isNaN(analysisId)) {
    return new Map();
  }

  // Get all modules for this analysis
  const modules = await db
    .select({
      id: schema.module.id,
      filePath: schema.module.filePath,
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, analysisId));

  const moduleMap = new Map(modules.map((m) => [m.id, m.filePath]));

  // Get all dependencies
  const dependencies = await db
    .select({
      id: schema.dependency.id,
      analysisRunId: schema.dependency.analysisRunId,
      importerModuleId: schema.dependency.importerModuleId,
      importedModuleId: schema.dependency.importedModuleId,
      importType: schema.dependency.importType,
      importedSymbols: schema.dependency.importedSymbols,
    })
    .from(schema.dependency)
    .where(eq(schema.dependency.analysisRunId, analysisId));

  // Build dependency graph
  const graph = new Map<number, DependencyNode>();

  // Initialize nodes
  for (const module of modules) {
    graph.set(module.id, {
      moduleId: module.id,
      filePath: module.filePath,
      dependencies: [],
      dependents: [],
    });
  }

  // Add edges
  for (const dep of dependencies) {
    const importerPath = moduleMap.get(dep.importerModuleId);
    const importedPath = moduleMap.get(dep.importedModuleId);

    if (!importerPath || !importedPath) {
      continue; // Skip if module not found
    }

    const edge: DependencyEdge = {
      targetModuleId: dep.importedModuleId,
      targetPath: importedPath,
      importType: dep.importType as "static" | "dynamic",
      importedSymbols: safeJsonParse<string[]>(dep.importedSymbols),
    };

    // Add as dependency of importer
    const importerNode = graph.get(dep.importerModuleId);
    if (importerNode) {
      importerNode.dependencies.push(edge);
    }

    // Add as dependent of imported
    const importedNode = graph.get(dep.importedModuleId);
    if (importedNode) {
      const reverseEdge: DependencyEdge = {
        targetModuleId: dep.importerModuleId,
        targetPath: importerPath,
        importType: dep.importType as "static" | "dynamic",
        importedSymbols: safeJsonParse<string[]>(dep.importedSymbols),
      };
      importedNode.dependents.push(reverseEdge);
    }
  }

  return graph;
}

/**
 * Get treemap data for hierarchical visualization
 * @param id - Analysis run ID (as string for URL compatibility)
 * @returns Hierarchical treemap data structure
 * @note Limited to 1000 modules for performance. For larger codebases, consider pagination or filtering.
 */
export async function getAnalysisTreemap(id: string): Promise<TreemapNode> {
  const analysisId = parseInt(id, 10);
  if (isNaN(analysisId)) {
    return {
      name: "root",
      children: [],
    };
  }

  // Get modules for the analysis (limited to 1000 for performance)
  const modules = await db
    .select({
      id: schema.module.id,
      filePath: schema.module.filePath,
      fileType: schema.module.fileType,
      originalSize: schema.module.originalSize,
      bundledSize: schema.module.bundledSize,
      isThirdParty: schema.module.isThirdParty,
      packageName: schema.module.packageName,
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, analysisId))
    .orderBy(desc(schema.module.bundledSize))
    .limit(1000);

  // Build directory tree structure
  const root: TreemapNode = {
    name: "root",
    children: [],
  };

  // Organize modules into directory structure
  for (const module of modules) {
    const pathParts = module.filePath
      .split("/")
      .filter((p) => p.length > 0 && p !== ".");
    let currentNode = root;

    // Navigate/create directory structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      let childNode = currentNode.children?.find(
        (c) => c.name === part && !c.moduleId,
      );

      if (!childNode) {
        childNode = {
          name: part,
          children: [],
        };
        currentNode.children = currentNode.children || [];
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    }

    // Add module as leaf node
    const fileName = pathParts[pathParts.length - 1] || module.filePath;
    const moduleNode: TreemapNode = {
      name: fileName,
      value: module.bundledSize,
      moduleId: module.id,
      fileType: module.fileType,
      isThirdParty: module.isThirdParty,
      packageName: module.packageName,
      filePath: module.filePath,
      originalSize: module.originalSize,
      bundledSize: module.bundledSize,
    };
    currentNode.children = currentNode.children || [];
    currentNode.children.push(moduleNode);
  }

  return root;
}
