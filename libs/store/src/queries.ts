/**
 * Query operations for analysis runs
 * Provides CRUD operations and utility queries for stored analysis data
 */

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";

export interface AnalysisModuleFilters {
  /** Filter by file type (e.g., 'javascript', 'css') */
  fileType?: string;
  /** Filter by third-party status */
  isThirdParty?: boolean;
  /** Search by file path */
  search?: string;
  /** Page number for pagination (1-based) */
  page?: number;
  /** Number of results per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: "filePath" | "originalSize" | "bundledSize";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Options for listing analysis runs
 */
export interface ListAnalysisRunsOptions {
  /** Filter by project name */
  projectName?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Options for pruning old analysis runs
 */
export interface PruneAnalysisRunsOptions {
  /** Delete runs older than this many days */
  olderThanDays?: number;
  /** Keep at least this many runs per project */
  keepMinimum?: number;
}

/**
 * Analysis run data with summary statistics
 */
export interface AnalysisRunData {
  id: number;
  projectName: string | null;
  createdAt: string;
  bundler: string | null;
  moduleCount: number;
  bundleCount: number;
  totalSize: number;
  totalGzipSize: number | null;
}

/**
 * Project data with summary statistics
 */
export interface ProjectData {
  projectName: string;
  latestRunDate: string | null;
  totalRuns: number;
}

/**
 * Input data for saving an analysis run
 * This matches the IngestionData structure from web-sv
 */
export interface SaveAnalysisRunInput {
  /** Project name */
  projectName: string;
  /** Bundler type */
  bundler:
    | "webpack"
    | "rollup"
    | "esbuild"
    | "vite"
    | "parcel"
    | "nextjs"
    | "other";
  /** Bundle files */
  bundles?: Array<{
    fileName: string;
    fileType: string;
    size: number;
    gzipSize?: number;
  }>;
  /** Module data */
  modules?: Array<{
    filePath: string;
    fileType: string;
    originalSize: number;
    bundledSize: number;
    isThirdParty: boolean;
    packageName?: string;
    packageVersion?: string;
    exports?: string[];
    usedExports?: string[];
  }>;
  /** Chunk data */
  chunks?: Array<{
    name?: string;
    totalSize: number;
    isEntry: boolean;
    isAsync: boolean;
  }>;
}

/**
 * Result of saving an analysis run
 */
export interface SaveAnalysisRunResult {
  /** Created analysis run ID */
  analysisRunId: number;
  /** Summary statistics */
  stats: {
    modulesWritten: number;
    bundlesWritten: number;
    chunksWritten: number;
  };
}

/**
 * List analysis runs with optional filtering
 * @param db - Database instance
 * @param options - Query options
 * @returns Array of analysis runs with statistics
 */
export function listAnalysisRuns(
  db: BetterSQLite3Database<typeof schema>,
  options: ListAnalysisRunsOptions = {},
): AnalysisRunData[] {
  const { projectName, limit, offset = 0 } = options;

  let query = db
    .select({
      id: schema.analysisRun.id,
      projectName: schema.analysisRun.projectName,
      createdAt: schema.analysisRun.createdAt,
      bundler: schema.analysisRun.bundler,
    })
    .from(schema.analysisRun);

  if (projectName) {
    query = query.where(
      eq(schema.analysisRun.projectName, projectName),
    ) as typeof query;
  }

  query = query.orderBy(
    desc(schema.analysisRun.createdAt),
    desc(schema.analysisRun.id),
  ) as typeof query;

  if (limit) {
    query = query.limit(limit) as typeof query;
  }
  if (offset > 0) {
    query = query.offset(offset) as typeof query;
  }

  const runs = query.all();

  // Get statistics for each run
  return runs.map((run) => {
    const moduleStats = db
      .select({
        moduleCount: sql<number>`count(*)`.as("moduleCount"),
      })
      .from(schema.module)
      .where(eq(schema.module.analysisRunId, run.id))
      .get();

    const bundleStats = db
      .select({
        bundleCount: sql<number>`count(*)`.as("bundleCount"),
        totalSize: sql<number>`coalesce(sum(${schema.bundle.size}), 0)`.as(
          "totalSize",
        ),
        totalGzipSize: sql<number>`sum(${schema.bundle.gzipSize})`.as(
          "totalGzipSize",
        ),
      })
      .from(schema.bundle)
      .where(eq(schema.bundle.analysisRunId, run.id))
      .get();

    return {
      id: run.id,
      projectName: run.projectName,
      createdAt: run.createdAt,
      bundler: run.bundler,
      moduleCount: moduleStats?.moduleCount ?? 0,
      bundleCount: bundleStats?.bundleCount ?? 0,
      totalSize: Number(bundleStats?.totalSize ?? 0),
      totalGzipSize: bundleStats?.totalGzipSize
        ? Number(bundleStats.totalGzipSize)
        : null,
    };
  });
}

/**
 * List all unique projects with their latest run date and total run count
 * @param db - Database instance
 * @returns Array of projects with summary statistics
 */
export function listProjects(
  db: BetterSQLite3Database<typeof schema>,
): ProjectData[] {
  // Get all runs grouped by project name
  const projectsWithRunInfo = db
    .select({
      projectName: schema.analysisRun.projectName,
      latestRunDate: sql`MAX(${schema.analysisRun.createdAt})`,
      totalRuns: sql`COUNT(*)`,
    })
    .from(schema.analysisRun)
    .where(sql`${schema.analysisRun.projectName} IS NOT NULL`)
    .groupBy(schema.analysisRun.projectName)
    .orderBy(desc(sql`MAX(${schema.analysisRun.createdAt})`))
    .all();

  return projectsWithRunInfo as ProjectData[];
}

/**
 * Get the latest analysis run for a project
 * @param db - Database instance
 * @param projectName - Project name
 * @returns Latest analysis run or null if not found
 */
export function getLatestAnalysisRun(
  db: BetterSQLite3Database<typeof schema>,
  projectName: string,
): AnalysisRunData | null {
  const runs = listAnalysisRuns(db, { projectName, limit: 1 });
  return runs.length > 0 ? runs[0] : null;
}

/**
 * Get an analysis run by ID
 * @param db - Database instance
 * @param id - Analysis run ID
 * @returns Analysis run or null if not found
 */
export function getAnalysisDetails(
  db: BetterSQLite3Database<typeof schema>,
  id: number,
): AnalysisRunData | null {
  return getAnalysisRunById(db, id);
}

/**
 * Get the modules for an analysis run
 * @param db - Database instance
 * @param id - Analysis run ID
 * @param filters - Optional filters
 * @returns Array of modules with pagination info
 */
export function getAnalysisModules(
  db: BetterSQLite3Database<typeof schema>,
  id: number,
  filters?: AnalysisModuleFilters,
) {
  const {
    fileType,
    isThirdParty,
    search,
    page = 1,
    pageSize = 50,
    sortBy = "bundledSize",
    sortOrder = "desc",
  } = filters || {};

  // Build WHERE conditions
  const conditions = [eq(schema.module.analysisRunId, id)];

  if (fileType) {
    conditions.push(eq(schema.module.fileType, fileType));
  }

  if (isThirdParty !== undefined) {
    conditions.push(eq(schema.module.isThirdParty, isThirdParty));
  }

  // Add search filter to conditions
  if (search) {
    conditions.push(sql`${schema.module.filePath} LIKE ${`%${search}%`}`);
  }

  // Get total count
  const totalCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.module)
    .where(and(...conditions))
    .get();

  // Build query
  let query = db
    .select({
      id: schema.module.id,
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
    .where(and(...conditions));

  // Apply sorting
  const sortColumn =
    sortBy === "filePath"
      ? schema.module.filePath
      : sortBy === "originalSize"
        ? schema.module.originalSize
        : schema.module.bundledSize;

  query =
    sortOrder === "asc"
      ? (query.orderBy(sortColumn) as typeof query)
      : (query.orderBy(desc(sortColumn)) as typeof query);

  // Apply pagination
  const offset = (page - 1) * pageSize;
  query = query.limit(pageSize).offset(offset) as typeof query;

  const modules = query.all();

  return {
    modules: modules.map((m) => ({
      ...m,
      exports: m.exports ? JSON.parse(m.exports) : null,
      usedExports: m.usedExports ? JSON.parse(m.usedExports) : null,
    })),
    pagination: {
      page,
      pageSize,
      totalCount: totalCount?.count ?? 0,
      totalPages: Math.ceil((totalCount?.count ?? 0) / pageSize),
    },
  };
}

/**
 * Get the bundles for an analysis run
 * @param db - Database instance
 * @param id - Analysis run ID
 * @returns Array of bundles
 */
export function getAnalysisBundles(
  db: BetterSQLite3Database<typeof schema>,
  id: number,
) {
  return db
    .select({
      id: schema.bundle.id,
      fileName: schema.bundle.fileName,
      fileType: schema.bundle.fileType,
      size: schema.bundle.size,
      gzipSize: schema.bundle.gzipSize,
    })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, id))
    .orderBy(desc(schema.bundle.size))
    .all();
}

/**
 * Get the dependency graph for an analysis run
 * @param db - Database instance
 * @param id - Analysis run ID
 * @returns Dependency graph with nodes and edges
 */
export function getAnalysisDependencyGraph(
  db: BetterSQLite3Database<typeof schema>,
  id: number,
) {
  // Get all modules for this analysis
  const modules = db
    .select({
      id: schema.module.id,
      filePath: schema.module.filePath,
      bundledSize: schema.module.bundledSize,
      isThirdParty: schema.module.isThirdParty,
      packageName: schema.module.packageName,
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, id))
    .all();

  // Get all dependencies
  const dependencies = db
    .select({
      id: schema.dependency.id,
      importerModuleId: schema.dependency.importerModuleId,
      importedModuleId: schema.dependency.importedModuleId,
      importType: schema.dependency.importType,
      importedSymbols: schema.dependency.importedSymbols,
    })
    .from(schema.dependency)
    .where(eq(schema.dependency.analysisRunId, id))
    .all();

  return {
    nodes: modules.map((m) => ({
      id: m.id,
      filePath: m.filePath,
      bundledSize: m.bundledSize,
      isThirdParty: m.isThirdParty,
      packageName: m.packageName,
    })),
    edges: dependencies.map((d) => ({
      id: d.id,
      source: d.importerModuleId,
      target: d.importedModuleId,
      importType: d.importType,
      importedSymbols: d.importedSymbols ? JSON.parse(d.importedSymbols) : null,
    })),
  };
}

/**
 * Get the treemap data for an analysis run
 * @param db - Database instance
 * @param id - Analysis run ID
 * @returns Treemap data organized hierarchically
 */
export function getAnalysisTreemap(
  db: BetterSQLite3Database<typeof schema>,
  id: number,
) {
  // Get all modules
  const modules = db
    .select({
      filePath: schema.module.filePath,
      bundledSize: schema.module.bundledSize,
      isThirdParty: schema.module.isThirdParty,
      packageName: schema.module.packageName,
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, id))
    .all();

  // Build hierarchical structure
  // Group by package for third-party, or by directory for first-party
  const root: any = {
    name: "root",
    children: [],
  };

  const thirdPartyMap = new Map<string, any>();
  const firstPartyMap = new Map<string, any>();

  for (const module of modules) {
    if (module.isThirdParty && module.packageName) {
      // Group third-party modules by package
      if (!thirdPartyMap.has(module.packageName)) {
        thirdPartyMap.set(module.packageName, {
          name: module.packageName,
          value: 0,
          children: [],
        });
      }
      const packageNode = thirdPartyMap.get(module.packageName)!;
      packageNode.value += module.bundledSize;
      packageNode.children.push({
        name: module.filePath,
        value: module.bundledSize,
      });
    } else {
      // Group first-party modules by top-level directory
      const parts = module.filePath.split("/");
      const topDir = parts[0] || "root";

      if (!firstPartyMap.has(topDir)) {
        firstPartyMap.set(topDir, {
          name: topDir,
          value: 0,
          children: [],
        });
      }
      const dirNode = firstPartyMap.get(topDir)!;
      dirNode.value += module.bundledSize;
      dirNode.children.push({
        name: module.filePath,
        value: module.bundledSize,
      });
    }
  }

  // Add third-party packages to root
  if (thirdPartyMap.size > 0) {
    const thirdPartyNode = {
      name: "node_modules",
      children: Array.from(thirdPartyMap.values()),
      value: Array.from(thirdPartyMap.values()).reduce(
        (sum, pkg) => sum + pkg.value,
        0,
      ),
    };
    root.children.push(thirdPartyNode);
  }

  // Add first-party directories to root
  root.children.push(...Array.from(firstPartyMap.values()));

  // Calculate root value
  root.value = root.children.reduce(
    (sum: number, child: any) => sum + child.value,
    0,
  );

  return root;
}

/**
 * Get an analysis run by ID
 * @param db - Database instance
 * @param id - Analysis run ID
 * @returns Analysis run or null if not found
 */
export function getAnalysisRunById(
  db: BetterSQLite3Database<typeof schema>,
  id: number,
): AnalysisRunData | null {
  const run = db
    .select({
      id: schema.analysisRun.id,
      projectName: schema.analysisRun.projectName,
      createdAt: schema.analysisRun.createdAt,
      bundler: schema.analysisRun.bundler,
    })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.id, id))
    .get();

  if (!run) {
    return null;
  }

  const moduleStats = db
    .select({
      moduleCount: sql<number>`count(*)`.as("moduleCount"),
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, run.id))
    .get();

  const bundleStats = db
    .select({
      bundleCount: sql<number>`count(*)`.as("bundleCount"),
      totalSize: sql<number>`coalesce(sum(${schema.bundle.size}), 0)`.as(
        "totalSize",
      ),
      totalGzipSize: sql<number>`sum(${schema.bundle.gzipSize})`.as(
        "totalGzipSize",
      ),
    })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, run.id))
    .get();

  return {
    id: run.id,
    projectName: run.projectName,
    createdAt: run.createdAt,
    bundler: run.bundler,
    moduleCount: moduleStats?.moduleCount ?? 0,
    bundleCount: bundleStats?.bundleCount ?? 0,
    totalSize: Number(bundleStats?.totalSize ?? 0),
    totalGzipSize: bundleStats?.totalGzipSize
      ? Number(bundleStats.totalGzipSize)
      : null,
  };
}

/**
 * Save an analysis run with full data
 * @param db - Database instance
 * @param data - Analysis run data
 * @returns Result with analysis run ID and statistics
 */
export function saveAnalysisRun(
  db: BetterSQLite3Database<typeof schema>,
  data: SaveAnalysisRunInput,
): SaveAnalysisRunResult {
  return db.transaction((tx) => {
    const stats = {
      modulesWritten: 0,
      bundlesWritten: 0,
      chunksWritten: 0,
    };

    // Step 1: Create analysis run
    const analysisRunResult = tx
      .insert(schema.analysisRun)
      .values({
        projectName: data.projectName,
        bundler: data.bundler,
      })
      .returning({ id: schema.analysisRun.id })
      .get();

    const analysisRunId = analysisRunResult.id;

    // Step 2: Insert bundles
    if (data.bundles && data.bundles.length > 0) {
      tx.insert(schema.bundle)
        .values(
          data.bundles.map((bundle) => ({
            analysisRunId,
            fileName: bundle.fileName,
            fileType: bundle.fileType,
            size: bundle.size,
            gzipSize: bundle.gzipSize ?? null,
          })),
        )
        .run();
      stats.bundlesWritten = data.bundles.length;
    }

    // Step 3: Insert modules
    if (data.modules && data.modules.length > 0) {
      tx.insert(schema.module)
        .values(
          data.modules.map((module) => ({
            analysisRunId,
            filePath: module.filePath,
            fileType: module.fileType,
            originalSize: module.originalSize,
            bundledSize: module.bundledSize,
            isThirdParty: module.isThirdParty,
            packageName: module.packageName ?? null,
            packageVersion: module.packageVersion ?? null,
            exports: module.exports ? JSON.stringify(module.exports) : null,
            usedExports: module.usedExports
              ? JSON.stringify(module.usedExports)
              : null,
          })),
        )
        .run();
      stats.modulesWritten = data.modules.length;
    }

    // Step 4: Insert chunks
    if (data.chunks && data.chunks.length > 0) {
      tx.insert(schema.chunk)
        .values(
          data.chunks.map((chunk) => ({
            analysisRunId,
            name: chunk.name ?? null,
            totalSize: chunk.totalSize,
            isEntry: chunk.isEntry,
            isAsync: chunk.isAsync,
          })),
        )
        .run();
      stats.chunksWritten = data.chunks.length;
    }

    return {
      analysisRunId,
      stats,
    };
  });
}

/**
 * Prune old analysis runs, keeping a minimum per project
 * @param db - Database instance
 * @param options - Pruning options
 * @returns Number of runs deleted
 */
export function pruneAnalysisRuns(
  db: BetterSQLite3Database<typeof schema>,
  options: PruneAnalysisRunsOptions = {},
): number {
  const { olderThanDays, keepMinimum = 5 } = options;

  return db.transaction((tx) => {
    let totalDeleted = 0;

    // Get all unique project names using SQL DISTINCT
    const allRuns = tx
      .select({
        projectName: schema.analysisRun.projectName,
      })
      .from(schema.analysisRun)
      .all();

    // Get unique project names
    const uniqueProjectNames = new Set<string>();
    for (const run of allRuns) {
      if (run.projectName) {
        uniqueProjectNames.add(run.projectName);
      }
    }

    for (const projectName of uniqueProjectNames) {
      // Get all runs for this project, ordered by date (newest first)
      const runs = tx
        .select({
          id: schema.analysisRun.id,
          createdAt: schema.analysisRun.createdAt,
        })
        .from(schema.analysisRun)
        .where(eq(schema.analysisRun.projectName, projectName))
        .orderBy(desc(schema.analysisRun.createdAt))
        .all();

      // Filter runs to delete
      const runsToDelete = runs.slice(keepMinimum);

      if (olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        const cutoffDateStr = cutoffDate.toISOString();

        // Only delete runs older than the cutoff date
        const oldRuns = runsToDelete.filter(
          (run) => run.createdAt && new Date(run.createdAt) < cutoffDate,
        );

        // Delete old runs (cascading deletes will handle related data)
        for (const run of oldRuns) {
          tx.delete(schema.analysisRun)
            .where(eq(schema.analysisRun.id, run.id))
            .run();
          totalDeleted++;
        }
      } else {
        // Delete all runs beyond the minimum
        for (const run of runsToDelete) {
          tx.delete(schema.analysisRun)
            .where(eq(schema.analysisRun.id, run.id))
            .run();
          totalDeleted++;
        }
      }
    }

    return totalDeleted;
  });
}
