/**
 * Remote query functions for bundle analysis data
 * These functions provide type-safe server-side data access using SvelteKit's remote functions
 */

import * as v from 'valibot';
import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { db } from '../db';
import {
  analysisRun,
  module,
  symbol,
  dependency,
  chunk,
  bundle,
  suggestion,
  suggestionLink,
} from '../db/schema';
import { eq, desc, asc, and, gte, lte, sql, count } from 'drizzle-orm';
import type {
  AnalysisSummary,
  LegacyAnalysisComparison as AnalysisComparison,
  DependencyGraph,
  LegacyPaginatedResult as PaginatedResult,
  Module,
  Symbol,
  SuggestionWithLinks,
} from './types';

// Validation schemas
const projectNameSchema = v.pipe(v.string(), v.nonEmpty('Project name is required'));

const analysisIdSchema = v.pipe(
  v.number(),
  v.integer('Analysis ID must be an integer'),
  v.minValue(1, 'Analysis ID must be positive'),
);

const moduleIdSchema = v.pipe(
  v.number(),
  v.integer('Module ID must be an integer'),
  v.minValue(1, 'Module ID must be positive'),
);

const modulesFilterSchema = v.optional(
  v.object({
    fileType: v.optional(v.string()),
    isThirdParty: v.optional(v.boolean()),
    minSize: v.optional(v.number()),
    maxSize: v.optional(v.number()),
    sortBy: v.optional(v.picklist(['filePath', 'bundledSize', 'originalSize'])),
    sortOrder: v.optional(v.picklist(['asc', 'desc'])),
    limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(1000))),
    offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  }),
  {},
);

const symbolsFilterSchema = v.optional(
  v.object({
    type: v.optional(v.picklist(['function', 'class', 'variable'])),
    isExported: v.optional(v.boolean()),
    minSize: v.optional(v.number()),
    maxSize: v.optional(v.number()),
    sortBy: v.optional(v.picklist(['name', 'computedBundledSize', 'computedGzipSize'])),
    sortOrder: v.optional(v.picklist(['asc', 'desc'])),
    limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(1000))),
    offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  }),
  {},
);

const compareAnalysesSchema = v.object({
  id1: analysisIdSchema,
  id2: analysisIdSchema,
});

/**
 * Get the latest analysis run for a given project
 */
export const getLatestAnalysis = query(projectNameSchema, async (projectName) => {
  const [latest] = await db
    .select()
    .from(analysisRun)
    .where(eq(analysisRun.projectName, projectName))
    .orderBy(desc(analysisRun.createdAt))
    .limit(1);

  if (!latest) {
    error(404, `No analysis found for project "${projectName}"`);
  }

  return await getAnalysisSummary(latest.id);
});

/**
 * Get a specific analysis run by ID with detailed statistics
 */
export const getAnalysisById = query(analysisIdSchema, async (id) => {
  const [analysis] = await db.select().from(analysisRun).where(eq(analysisRun.id, id)).limit(1);

  if (!analysis) {
    error(404, `Analysis with ID ${id} not found`);
  }

  return await getAnalysisSummary(id);
});

/**
 * Get modules for an analysis with filtering and pagination
 */
export const getModulesByAnalysis = query(
  v.object({
    analysisId: analysisIdSchema,
    options: modulesFilterSchema,
  }),
  async ({ analysisId, options }) => {
    // Verify analysis exists
    const [analysis] = await db
      .select()
      .from(analysisRun)
      .where(eq(analysisRun.id, analysisId))
      .limit(1);

    if (!analysis) {
      error(404, `Analysis with ID ${analysisId} not found`);
    }

    // Build filter conditions
    const conditions = [eq(module.analysisRunId, analysisId)];

    if (options.fileType) {
      conditions.push(eq(module.fileType, options.fileType));
    }

    if (options.isThirdParty !== undefined) {
      conditions.push(eq(module.isThirdParty, options.isThirdParty));
    }

    if (options.minSize !== undefined) {
      conditions.push(gte(module.bundledSize, options.minSize));
    }

    if (options.maxSize !== undefined) {
      conditions.push(lte(module.bundledSize, options.maxSize));
    }

    const where = and(...conditions);

    // Get total count
    const [{ total }] = await db.select({ total: count() }).from(module).where(where);

    // Build sort order
    const sortBy = options.sortBy || 'bundledSize';
    const sortOrder = options.sortOrder || 'desc';
    const orderBy = sortOrder === 'asc' ? asc(module[sortBy]) : desc(module[sortBy]);

    // Get paginated data
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const modulesRaw = await db
      .select()
      .from(module)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Parse JSON fields for exports and usedExports
    const modules: Module[] = modulesRaw.map((mod) => ({
      ...mod,
      exports: mod.exports ? JSON.parse(mod.exports) : null,
      usedExports: mod.usedExports ? JSON.parse(mod.usedExports) : null,
    }));

    const result: PaginatedResult<Module> = {
      data: modules,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    return result;
  },
);

/**
 * Get symbols for a specific module with filtering and pagination
 */
export const getSymbolsByModule = query(
  v.object({
    moduleId: moduleIdSchema,
    options: symbolsFilterSchema,
  }),
  async ({ moduleId, options }) => {
    // Verify module exists
    const [mod] = await db.select().from(module).where(eq(module.id, moduleId)).limit(1);

    if (!mod) {
      error(404, `Module with ID ${moduleId} not found`);
    }

    // Build filter conditions
    const conditions = [eq(symbol.moduleId, moduleId)];

    if (options.type) {
      conditions.push(eq(symbol.type, options.type));
    }

    if (options.isExported !== undefined) {
      conditions.push(eq(symbol.isExported, options.isExported));
    }

    if (options.minSize !== undefined) {
      conditions.push(gte(symbol.computedBundledSize, options.minSize));
    }

    if (options.maxSize !== undefined) {
      conditions.push(lte(symbol.computedBundledSize, options.maxSize));
    }

    const where = and(...conditions);

    // Get total count
    const [{ total }] = await db.select({ total: count() }).from(symbol).where(where);

    // Build sort order
    const sortBy = options.sortBy || 'computedBundledSize';
    const sortOrder = options.sortOrder || 'desc';
    const orderBy = sortOrder === 'asc' ? asc(symbol[sortBy]) : desc(symbol[sortBy]);

    // Get paginated data
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const symbols = await db
      .select()
      .from(symbol)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const result: PaginatedResult<Symbol> = {
      data: symbols,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    return result;
  },
);

/**
 * Get the dependency graph for an analysis
 */
export const getDependencyGraph = query(analysisIdSchema, async (analysisId) => {
  // Verify analysis exists
  const [analysis] = await db
    .select()
    .from(analysisRun)
    .where(eq(analysisRun.id, analysisId))
    .limit(1);

  if (!analysis) {
    error(404, `Analysis with ID ${analysisId} not found`);
  }

  // Get all modules for this analysis
  const modules = await db.select().from(module).where(eq(module.analysisRunId, analysisId));

  // Get all dependencies for this analysis
  const dependencies = await db
    .select()
    .from(dependency)
    .where(eq(dependency.analysisRunId, analysisId));

  // Parse imported symbols JSON
  const edges = dependencies.map((dep) => ({
    from: dep.importerModuleId,
    to: dep.importedModuleId,
    importType: dep.importType,
    importedSymbols: dep.importedSymbols ? JSON.parse(dep.importedSymbols) : null,
  }));

  const graph: DependencyGraph = {
    nodes: modules.map((mod) => ({
      id: mod.id,
      filePath: mod.filePath,
      bundledSize: mod.bundledSize,
      isThirdParty: mod.isThirdParty,
      packageName: mod.packageName,
    })),
    edges,
  };

  return graph;
});

/**
 * Compare two analysis runs and return the differences
 */
export const compareAnalyses = query(compareAnalysesSchema, async ({ id1, id2 }) => {
  // Get both analyses
  const [before, after] = await Promise.all([getAnalysisSummary(id1), getAnalysisSummary(id2)]);

  // Get modules for both analyses
  const [modulesBeforeRaw, modulesAfterRaw] = await Promise.all([
    db.select().from(module).where(eq(module.analysisRunId, id1)),
    db.select().from(module).where(eq(module.analysisRunId, id2)),
  ]);

  // Parse JSON fields for exports and usedExports
  const modulesBefore: Module[] = modulesBeforeRaw.map((mod) => ({
    ...mod,
    exports: mod.exports ? JSON.parse(mod.exports) : null,
    usedExports: mod.usedExports ? JSON.parse(mod.usedExports) : null,
  }));

  const modulesAfter: Module[] = modulesAfterRaw.map((mod) => ({
    ...mod,
    exports: mod.exports ? JSON.parse(mod.exports) : null,
    usedExports: mod.usedExports ? JSON.parse(mod.usedExports) : null,
  }));

  // Create maps for comparison
  const beforeMap = new Map(modulesBefore.map((m) => [m.filePath, m]));
  const afterMap = new Map(modulesAfter.map((m) => [m.filePath, m]));

  // Find added, removed, and changed modules
  const addedModules: Module[] = [];
  const removedModules: Module[] = [];
  const changedModules: Array<{
    module: Module;
    beforeSize: number;
    afterSize: number;
    sizeDiff: number;
  }> = [];

  for (const mod of modulesAfter) {
    const beforeMod = beforeMap.get(mod.filePath);
    if (!beforeMod) {
      addedModules.push(mod);
    } else if (beforeMod.bundledSize !== mod.bundledSize) {
      changedModules.push({
        module: mod,
        beforeSize: beforeMod.bundledSize,
        afterSize: mod.bundledSize,
        sizeDiff: mod.bundledSize - beforeMod.bundledSize,
      });
    }
  }

  for (const mod of modulesBefore) {
    if (!afterMap.has(mod.filePath)) {
      removedModules.push(mod);
    }
  }

  const comparison: AnalysisComparison = {
    before,
    after,
    diff: {
      totalSizeDiff: after.totalSize - before.totalSize,
      totalGzipSizeDiff: after.totalGzipSize - before.totalGzipSize,
      modulesDiff: after.totalModules - before.totalModules,
      addedModules,
      removedModules,
      changedModules,
    },
  };

  return comparison;
});

/**
 * Get all unique project names
 */
export const getAllProjects = query(v.optional(v.any()), async () => {
  const projects = await db
    .select({ projectName: analysisRun.projectName })
    .from(analysisRun)
    .where(sql`${analysisRun.projectName} IS NOT NULL`);

  const uniqueProjects = [...new Set(projects.map((p) => p.projectName).filter(Boolean))];
  return uniqueProjects;
});

/**
 * Get all analysis runs for a project, ordered by creation date (newest first)
 */
export const getAnalysisHistory = query(projectNameSchema, async (projectName) => {
  const runs = await db
    .select()
    .from(analysisRun)
    .where(eq(analysisRun.projectName, projectName))
    .orderBy(desc(analysisRun.createdAt), desc(analysisRun.id));

  // Get aggregated statistics for each run
  const runsWithStats = await Promise.all(
    runs.map(async (run) => {
      return await getAnalysisSummary(run.id);
    }),
  );

  return runsWithStats;
});

/**
 * Helper function to get analysis summary with aggregated statistics
 */
async function getAnalysisSummary(analysisId: number): Promise<AnalysisSummary> {
  const [analysis] = await db
    .select()
    .from(analysisRun)
    .where(eq(analysisRun.id, analysisId))
    .limit(1);

  if (!analysis) {
    error(404, `Analysis with ID ${analysisId} not found`);
  }

  // Get aggregated statistics
  const [stats] = await db
    .select({
      totalModules: count(module.id),
      totalSize: sql<number>`coalesce(sum(${module.bundledSize}), 0)`,
      thirdPartyModules: sql<number>`coalesce(sum(case when ${module.isThirdParty} = 1 then 1 else 0 end), 0)`,
      thirdPartySize: sql<number>`coalesce(sum(case when ${module.isThirdParty} = 1 then ${module.bundledSize} else 0 end), 0)`,
    })
    .from(module)
    .where(eq(module.analysisRunId, analysisId));

  const [chunksStats] = await db
    .select({
      chunksCount: count(chunk.id),
    })
    .from(chunk)
    .where(eq(chunk.analysisRunId, analysisId));

  const [bundlesStats] = await db
    .select({
      bundlesCount: count(bundle.id),
      totalGzipSize: sql<number>`coalesce(sum(${bundle.gzipSize}), 0)`,
    })
    .from(bundle)
    .where(eq(bundle.analysisRunId, analysisId));

  const summary: AnalysisSummary = {
    ...analysis,
    totalModules: stats.totalModules,
    totalSize: stats.totalSize,
    totalGzipSize: bundlesStats.totalGzipSize,
    thirdPartyModules: stats.thirdPartyModules,
    thirdPartySize: stats.thirdPartySize,
    chunksCount: chunksStats.chunksCount,
    bundlesCount: bundlesStats.bundlesCount,
  };

  return summary;
}

/**
 * Get suggestions for an analysis with optional filtering
 */
export const getSuggestionsByAnalysis = query(
  v.object({
    analysisId: analysisIdSchema,
    options: v.optional(
      v.object({
        type: v.optional(v.string()),
        severity: v.optional(v.picklist(['critical', 'warning', 'info'])),
        limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(1000))),
        offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
      }),
      {},
    ),
  }),
  async ({ analysisId, options }) => {
    // Verify analysis exists
    const [analysis] = await db
      .select()
      .from(analysisRun)
      .where(eq(analysisRun.id, analysisId))
      .limit(1);

    if (!analysis) {
      error(404, `Analysis with ID ${analysisId} not found`);
    }

    // Build filter conditions
    const conditions = [eq(suggestion.analysisRunId, analysisId)];

    if (options?.type) {
      conditions.push(eq(suggestion.type, options.type));
    }

    if (options?.severity) {
      conditions.push(eq(suggestion.severity, options.severity));
    }

    const where = and(...conditions);

    // Get total count
    const [{ total }] = await db.select({ total: count() }).from(suggestion).where(where);

    // Get paginated data
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const suggestions = await db
      .select()
      .from(suggestion)
      .where(where)
      .orderBy(
        // Order by severity (critical > warning > info), then by id
        sql`CASE ${suggestion.severity}
            WHEN 'critical' THEN 1
            WHEN 'warning' THEN 2
            WHEN 'info' THEN 3
            END`,
        asc(suggestion.id),
      )
      .limit(limit)
      .offset(offset);

    // Get links for each suggestion
    const suggestionsWithLinks: SuggestionWithLinks[] = await Promise.all(
      suggestions.map(async (sug) => {
        const links = await db
          .select()
          .from(suggestionLink)
          .where(eq(suggestionLink.suggestionId, sug.id));

        // Resolve entity paths for modules
        const linksWithPaths = await Promise.all(
          links.map(async (link) => {
            if (link.entityType === 'Module') {
              const [mod] = await db
                .select({ filePath: module.filePath })
                .from(module)
                .where(eq(module.id, link.entityId))
                .limit(1);

              return {
                entityType: link.entityType as 'Module' | 'Symbol' | 'Dependency' | 'Chunk',
                entityId: link.entityId,
                entityPath: mod?.filePath,
              };
            }
            return {
              entityType: link.entityType as 'Module' | 'Symbol' | 'Dependency' | 'Chunk',
              entityId: link.entityId,
            };
          }),
        );

        return {
          ...sug,
          severity: sug.severity as 'critical' | 'warning' | 'info',
          links: linksWithPaths,
        };
      }),
    );

    const result: PaginatedResult<SuggestionWithLinks> = {
      data: suggestionsWithLinks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    return result;
  },
);

/**
 * Get hierarchical treemap data for visualization
 */
export const getTreemapData = query(
  v.object({
    analysisId: analysisIdSchema,
    includeSymbols: v.optional(v.boolean(), false),
    maxModules: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10000)), 1000),
  }),
  async ({ analysisId, includeSymbols, maxModules }) => {
    // Import the getTreemapData function from index.ts
    const { getTreemapData: getTreemapDataImpl } = await import('./index.js');

    // Verify analysis exists
    const [analysis] = await db
      .select()
      .from(analysisRun)
      .where(eq(analysisRun.id, analysisId))
      .limit(1);

    if (!analysis) {
      error(404, `Analysis with ID ${analysisId} not found`);
    }

    return await getTreemapDataImpl(analysisId, {
      includeSymbols,
      maxModules,
    });
  },
);
