/**
 * Query operations for analysis runs
 * Provides CRUD operations and utility queries for stored analysis data
 */

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";
import { eq, desc, and, gte, sql } from "drizzle-orm";

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
