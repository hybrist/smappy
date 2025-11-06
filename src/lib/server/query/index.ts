/**
 * Query functions for bundle analysis data
 * Server-side functions to retrieve bundle analysis data from the database
 */

import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, asc, and, like, sql } from 'drizzle-orm';
import type {
  AnalysisRun,
  Module,
  Symbol,
  Dependency,
  DependencyNode,
  DependencyEdge,
  AnalysisComparison,
  ModuleQueryOptions,
  PaginatedResult,
} from './types.js';

// ============================================================================
// Analysis Run Queries
// ============================================================================

/**
 * Get the latest analysis run for a project
 *
 * @param projectName - Project name
 * @returns Latest analysis run or null if not found
 */
export async function getLatestAnalysis(projectName: string): Promise<AnalysisRun | null> {
  // Get most recent analysis run
  const runs = await db
    .select({
      id: schema.analysisRun.id,
      projectName: schema.analysisRun.projectName,
      createdAt: schema.analysisRun.createdAt,
      bundler: schema.analysisRun.bundler,
    })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.projectName, projectName))
    .orderBy(desc(schema.analysisRun.createdAt), desc(schema.analysisRun.id))
    .limit(1);

  if (runs.length === 0) {
    return null;
  }

  const run = runs[0];

  // Get aggregated statistics - separate queries for accuracy
  const [moduleStats, bundleStats] = await Promise.all([
    db
      .select({
        moduleCount: sql<number>`count(*)`.as('moduleCount'),
      })
      .from(schema.module)
      .where(eq(schema.module.analysisRunId, run.id)),
    db
      .select({
        bundleCount: sql<number>`count(*)`.as('bundleCount'),
        totalSize: sql<number>`sum(${schema.bundle.size})`.as('totalSize'),
        totalGzipSize: sql<number>`sum(${schema.bundle.gzipSize})`.as('totalGzipSize'),
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
}

/**
 * Get a specific analysis run by ID
 *
 * @param id - Analysis run ID
 * @returns Analysis run or null if not found
 */
export async function getAnalysisById(id: number): Promise<AnalysisRun | null> {
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

  // Get aggregated statistics - separate queries for accuracy
  const [moduleStats, bundleStats] = await Promise.all([
    db
      .select({
        moduleCount: sql<number>`count(*)`.as('moduleCount'),
      })
      .from(schema.module)
      .where(eq(schema.module.analysisRunId, id)),
    db
      .select({
        bundleCount: sql<number>`count(*)`.as('bundleCount'),
        totalSize: sql<number>`sum(${schema.bundle.size})`.as('totalSize'),
        totalGzipSize: sql<number>`sum(${schema.bundle.gzipSize})`.as('totalGzipSize'),
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

// ============================================================================
// Module Queries
// ============================================================================

/**
 * Get modules for an analysis run with filtering, sorting, and pagination
 *
 * @param analysisId - Analysis run ID
 * @param options - Query options (filtering, sorting, pagination)
 * @returns Paginated modules
 */
export async function getModulesByAnalysis(
  analysisId: number,
  options: ModuleQueryOptions = {},
): Promise<PaginatedResult<Module>> {
  const {
    fileType,
    isThirdParty,
    packageName,
    search,
    sortBy = 'filePath',
    sortOrder = 'asc',
    page = 1,
    pageSize = 50,
  } = options;

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
  let orderByClause;
  const sortField = getModuleSortField(sortBy);
  if (sortOrder === 'desc') {
    orderByClause = desc(sortField);
  } else {
    orderByClause = asc(sortField);
  }

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
    exports: m.exports ? JSON.parse(m.exports) : null,
    usedExports: m.usedExports ? JSON.parse(m.usedExports) : null,
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
 * Helper to get the sort field for modules
 */
function getModuleSortField(sortBy: string) {
  switch (sortBy) {
    case 'originalSize':
      return schema.module.originalSize;
    case 'bundledSize':
      return schema.module.bundledSize;
    case 'filePath':
    default:
      return schema.module.filePath;
  }
}

// ============================================================================
// Symbol Queries
// ============================================================================

/**
 * Get symbols for a specific module
 *
 * @param moduleId - Module ID
 * @returns Array of symbols
 */
export async function getSymbolsByModule(moduleId: number): Promise<Symbol[]> {
  const symbols = await db
    .select({
      id: schema.symbol.id,
      moduleId: schema.symbol.moduleId,
      name: schema.symbol.name,
      type: schema.symbol.type,
      sourceStartLine: schema.symbol.sourceStartLine,
      sourceStartCol: schema.symbol.sourceStartCol,
      sourceEndLine: schema.symbol.sourceEndLine,
      sourceEndCol: schema.symbol.sourceEndCol,
      astHash: schema.symbol.astHash,
      isExported: schema.symbol.isExported,
      computedBundledSize: schema.symbol.computedBundledSize,
      computedGzipSize: schema.symbol.computedGzipSize,
    })
    .from(schema.symbol)
    .where(eq(schema.symbol.moduleId, moduleId))
    .orderBy(asc(schema.symbol.sourceStartLine), asc(schema.symbol.sourceStartCol));

  return symbols.map((s) => ({
    ...s,
    astHash: s.astHash ?? null,
  }));
}

// ============================================================================
// Dependency Graph Queries
// ============================================================================

/**
 * Get dependency graph for an analysis run
 *
 * @param analysisId - Analysis run ID
 * @returns Map of module ID to dependency node
 */
export async function getDependencyGraph(analysisId: number): Promise<Map<number, DependencyNode>> {
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
      importType: dep.importType as 'static' | 'dynamic',
      importedSymbols: dep.importedSymbols ? JSON.parse(dep.importedSymbols) : null,
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
        importType: dep.importType as 'static' | 'dynamic',
        importedSymbols: dep.importedSymbols ? JSON.parse(dep.importedSymbols) : null,
      };
      importedNode.dependents.push(reverseEdge);
    }
  }

  return graph;
}

// ============================================================================
// Comparison Queries
// ============================================================================

/**
 * Compare two analysis runs
 *
 * @param id1 - First analysis run ID
 * @param id2 - Second analysis run ID
 * @returns Comparison result
 */
export async function compareAnalyses(
  id1: number,
  id2: number,
): Promise<AnalysisComparison | null> {
  // Get both analyses
  const run1 = await getAnalysisById(id1);
  const run2 = await getAnalysisById(id2);

  if (!run1 || !run2) {
    return null;
  }

  // Get modules for both runs
  const modules1 = await getModulesByAnalysis(id1, { pageSize: 10000 });
  const modules2 = await getModulesByAnalysis(id2, { pageSize: 10000 });

  const modules1Map = new Map(modules1.items.map((m) => [m.filePath, m]));
  const modules2Map = new Map(modules2.items.map((m) => [m.filePath, m]));

  // Compute module diff
  const added: Module[] = [];
  const removed: Module[] = [];
  const modified: AnalysisComparison['moduleDiff']['modified'] = [];
  const unchanged: Module[] = [];

  // Find added modules
  for (const module2 of modules2.items) {
    if (!modules1Map.has(module2.filePath)) {
      added.push(module2);
    }
  }

  // Find removed modules
  for (const module1 of modules1.items) {
    if (!modules2Map.has(module1.filePath)) {
      removed.push(module1);
    }
  }

  // Find modified/unchanged modules
  for (const module2 of modules2.items) {
    const module1 = modules1Map.get(module2.filePath);
    if (!module1) {
      continue; // Already counted as added
    }

    const sizeDelta = module2.bundledSize - module1.bundledSize;
    const exportsChanged =
      JSON.stringify(module1.exports ?? []) !== JSON.stringify(module2.exports ?? []);

    if (sizeDelta !== 0 || exportsChanged) {
      modified.push({
        module: module2,
        sizeDelta,
        exportsChanged,
      });
    } else {
      unchanged.push(module2);
    }
  }

  // Get bundle statistics
  const bundles1 = await db
    .select({ fileName: schema.bundle.fileName })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, id1));

  const bundles2 = await db
    .select({ fileName: schema.bundle.fileName })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, id2));

  const bundles1Names = new Set(bundles1.map((b) => b.fileName));
  const bundles2Names = new Set(bundles2.map((b) => b.fileName));

  let bundleAdded = 0;
  let bundleRemoved = 0;
  let bundleModified = 0;

  for (const name of bundles2Names) {
    if (!bundles1Names.has(name)) {
      bundleAdded++;
    } else {
      bundleModified++;
    }
  }

  for (const name of bundles1Names) {
    if (!bundles2Names.has(name)) {
      bundleRemoved++;
    }
  }

  return {
    run1,
    run2,
    moduleDiff: {
      added,
      removed,
      modified,
      unchanged,
    },
    sizeDelta: {
      totalSize: (run2.totalSize ?? 0) - (run1.totalSize ?? 0),
      totalGzipSize: (run2.totalGzipSize ?? 0) - (run1.totalGzipSize ?? 0),
    },
    bundleDiff: {
      added: bundleAdded,
      removed: bundleRemoved,
      modified: bundleModified,
    },
  };
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  AnalysisRun,
  Module,
  Symbol,
  Dependency,
  DependencyNode,
  DependencyEdge,
  AnalysisComparison,
  ModuleQueryOptions,
  PaginatedResult,
};
