import type { Store } from "@smappy/store";
import { schema } from "@smappy/store";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

type StoreDb = BetterSQLite3Database<typeof schema>;

/**
 * Bundle selected by the caller. Additional metadata is optional and will be
 * reloaded from the database when missing to ensure up-to-date data.
 */
export interface SelectedBundleContext {
  id: number;
  fileName?: string;
  fileType?: string;
  size?: number;
  gzipSize?: number | null;
}

/**
 * Context required to generate tool definitions.
 */
export interface BundleToolContext {
  store?: Store;
  db?: StoreDb;
  analysisId: number;
  bundle: SelectedBundleContext;
}

export interface BundleOverview {
  bundleId: number;
  bundleName: string;
  importedAt: string;
  totalSize: number;
  chunkCount: number;
  sourceFileCount: number;
  largestChunks: Array<{
    name: string;
    size: number;
    sizeFormatted: string;
  }>;
}

export interface ChunkInfo {
  name: string;
  size: number;
  sizeFormatted: string;
}

export interface ChunkDetails {
  name: string;
  size: number;
  sizeFormatted: string;
  sourceFiles: string[];
  sourceFileCount: number;
}

export interface SourceFileInfo {
  path: string;
  totalSize: number;
  sizeFormatted: string;
}

export interface SourceFragment {
  name: string;
  type: string;
  startLine: number;
  endLine: number;
  sourceSize: number;
  sizeFormatted: string;
}

export interface SourceFileAnalysis {
  filePath: string;
  totalFragments: number;
  fragments: SourceFragment[];
}

export interface FragmentSearchResult {
  filePath: string;
  fragmentName: string;
  type: string;
  startLine: number;
  endLine: number;
  sourceSize: number;
  sizeFormatted: string;
}

export interface LlmToolDefinition {
  type: "function";
  description: string;
  inputSchema: z.ZodTypeAny;
  execute: (input: unknown) => Promise<unknown>;
}

export type LlmToolDefinitions = Record<string, LlmToolDefinition>;

const emptyInputSchema = z.object({});
const listSortSchema = z.object({
  sortBy: z
    .enum(["size", "name"])
    .optional()
    .describe('Sort order: "size" (default) or "name"'),
});
const chunkDetailsSchema = z.object({
  chunkName: z.string().describe('The name of the chunk file (e.g., "main.js")'),
});
const sourceFileAnalysisSchema = z.object({
  filePath: z
    .string()
    .describe('The path to the source file (e.g., "src/components/App.tsx")'),
});
const fragmentSearchSchema = z.object({
  searchTerm: z
    .string()
    .describe("The search term to find in fragment names (case-insensitive)"),
});

/**
 * Create a set of tool definitions backed by @smappy/store data.
 */
export function createBundleTools(context: BundleToolContext): LlmToolDefinitions {
  const ctx = normalizeContext(context);

  return {
    get_bundle_overview: {
      description:
        "Get a high-level overview of the bundle including total size, chunk count, source file count, and the largest chunks. Use this when the user asks about bundle size, contents, or general information.",
      inputSchema: emptyInputSchema,
      type: "function",
      execute: async (input) => {
        emptyInputSchema.parse(input ?? {});
        return getBundleOverview(ctx);
      },
    },
    list_bundle_chunks: {
      description:
        'List all chunks (output files) in the bundle with their sizes. Useful when the user wants to see what chunks exist or which chunks are largest. Can sort by size (default) or name.',
      inputSchema: listSortSchema,
      type: "function",
      execute: async (input) => {
        const { sortBy } = listSortSchema.parse(input ?? {});
        return listBundleChunks(ctx, sortBy);
      },
    },
    get_chunk_details: {
      description:
        "Get detailed information about a specific chunk including its size and source files it contains. Use this when the user asks about a particular chunk file.",
      inputSchema: chunkDetailsSchema,
      type: "function",
      execute: async (input) => {
        const { chunkName } = chunkDetailsSchema.parse(input ?? {});
        return getChunkDetails(ctx, chunkName);
      },
    },
    list_source_files: {
      description:
        "List all source files in the bundle with their estimated sizes. Use this when the user wants to see what source files are in the bundle or which source files are largest.",
      inputSchema: listSortSchema,
      type: "function",
      execute: async (input) => {
        const { sortBy } = listSortSchema.parse(input ?? {});
        return listSourceFiles(ctx, sortBy);
      },
    },
    get_source_file_analysis: {
      description:
        'Get detailed analysis of a specific source file showing all functions, classes, and other code fragments. Use this when the user asks about what is in a specific source file.',
      inputSchema: sourceFileAnalysisSchema,
      type: "function",
      execute: async (input) => {
        const { filePath } = sourceFileAnalysisSchema.parse(input ?? {});
        return getSourceFileAnalysis(ctx, filePath);
      },
    },
    find_fragment: {
      description:
        "Search for functions, classes, methods, or other code fragments by name across all source files. Use this when the user is looking for a specific function or class.",
      inputSchema: fragmentSearchSchema,
      type: "function",
      execute: async (input) => {
        const { searchTerm } = fragmentSearchSchema.parse(input ?? {});
        return findFragment(ctx, searchTerm);
      },
    },
  };
}

type NormalizedContext = {
  db: StoreDb;
  store?: Store;
  analysisId: number;
  bundle: SelectedBundleContext;
};

function normalizeContext(context: BundleToolContext): NormalizedContext {
  const db = context.db ?? context.store?.db;

  if (!db) {
    throw new Error("A store or database instance is required to create LLM tools.");
  }

  if (!Number.isFinite(context.analysisId)) {
    throw new Error("A valid analysisId must be provided.");
  }

  if (!context.bundle?.id || !Number.isFinite(context.bundle.id)) {
    throw new Error("A valid bundle id must be provided in the context.");
  }

  return {
    db,
    store: context.store,
    analysisId: context.analysisId,
    bundle: context.bundle,
  };
}

async function getBundleOverview(context: NormalizedContext): Promise<BundleOverview> {
  const { db, analysisId, bundle } = context;

  const analysis = db
    .select({
      id: schema.analysisRun.id,
      createdAt: schema.analysisRun.createdAt,
    })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.id, analysisId))
    .get();

  if (!analysis) {
    throw new Error(`Analysis run ${analysisId} not found.`);
  }

  const selectedBundle = getBundleById(db, analysisId, bundle.id);

  const bundleStats =
    db
      .select({
        totalSize: sql<number>`coalesce(sum(${schema.bundle.size}), 0)`.as("totalSize"),
        chunkCount: sql<number>`count(*)`.as("chunkCount"),
      })
      .from(schema.bundle)
      .where(eq(schema.bundle.analysisRunId, analysisId))
      .get() ?? { totalSize: 0, chunkCount: 0 };

  const sourceCount =
    db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(schema.module)
      .where(eq(schema.module.analysisRunId, analysisId))
      .get() ?? { count: 0 };

  const largestChunks = db
    .select({
      name: schema.bundle.fileName,
      size: schema.bundle.size,
    })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, analysisId))
    .orderBy(desc(schema.bundle.size))
    .limit(5)
    .all()
    .map((row) => ({
      name: row.name ?? "(unnamed chunk)",
      size: Number(row.size ?? 0),
      sizeFormatted: formatBytes(Number(row.size ?? 0)),
    }));

  return {
    bundleId: selectedBundle.id,
    bundleName: selectedBundle.fileName ?? "(unnamed bundle)",
    importedAt: new Date(analysis.createdAt).toLocaleString(),
    totalSize: Number(bundleStats.totalSize ?? 0),
    chunkCount: Number(bundleStats.chunkCount ?? 0),
    sourceFileCount: Number(sourceCount.count ?? 0),
    largestChunks,
  };
}

async function listBundleChunks(
  context: NormalizedContext,
  sortBy: "size" | "name" = "size",
): Promise<ChunkInfo[]> {
  const { db, analysisId } = context;
  const rows = db
    .select({
      name: schema.bundle.fileName,
      size: schema.bundle.size,
    })
    .from(schema.bundle)
    .where(eq(schema.bundle.analysisRunId, analysisId))
    .orderBy(sortBy === "name" ? asc(schema.bundle.fileName) : desc(schema.bundle.size))
    .all();

  return rows.map((row) => {
    const size = Number(row.size ?? 0);
    return {
      name: row.name ?? "(unnamed chunk)",
      size,
      sizeFormatted: formatBytes(size),
    };
  });
}

async function getChunkDetails(
  context: NormalizedContext,
  chunkName: string,
): Promise<ChunkDetails> {
  const { db, analysisId } = context;
  const bundleRow = getBundleByName(db, analysisId, chunkName);

  const moduleSizeColumn = sql<number>`sum(${schema.sourceMapEntry.byteLength})`.as("totalSize");
  const moduleRows = db
    .select({
      filePath: schema.module.filePath,
      totalSize: moduleSizeColumn,
    })
    .from(schema.sourceMapEntry)
    .innerJoin(schema.symbol, eq(schema.sourceMapEntry.symbolId, schema.symbol.id))
    .innerJoin(schema.module, eq(schema.symbol.moduleId, schema.module.id))
    .where(
      and(
        eq(schema.sourceMapEntry.bundleId, bundleRow.id),
        eq(schema.module.analysisRunId, analysisId),
      ),
    )
    .groupBy(schema.module.id)
    .all();

  moduleRows.sort((a, b) => Number(b.totalSize ?? 0) - Number(a.totalSize ?? 0));

  return {
    name: bundleRow.fileName ?? chunkName,
    size: bundleRow.size ?? 0,
    sizeFormatted: formatBytes(bundleRow.size ?? 0),
    sourceFiles: moduleRows.map((row) => row.filePath ?? "(unknown source)"),
    sourceFileCount: moduleRows.length,
  };
}

async function listSourceFiles(
  context: NormalizedContext,
  sortBy: "size" | "name" = "size",
): Promise<SourceFileInfo[]> {
  const { db, analysisId } = context;
  const rows = db
    .select({
      path: schema.module.filePath,
      totalSize: schema.module.bundledSize,
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, analysisId))
    .all();

  rows.sort((a, b) => {
    if (sortBy === "name") {
      return (a.path ?? "").localeCompare(b.path ?? "");
    }
    return Number(b.totalSize ?? 0) - Number(a.totalSize ?? 0);
  });

  return rows.map((row) => {
    const size = Number(row.totalSize ?? 0);
    return {
      path: row.path ?? "(unknown source)",
      totalSize: size,
      sizeFormatted: formatBytes(size),
    };
  });
}

async function getSourceFileAnalysis(
  context: NormalizedContext,
  filePath: string,
): Promise<SourceFileAnalysis> {
  const { db, analysisId } = context;

  const targetModule = db
    .select({
      id: schema.module.id,
      filePath: schema.module.filePath,
    })
    .from(schema.module)
    .where(
      and(
        eq(schema.module.analysisRunId, analysisId),
        eq(schema.module.filePath, filePath),
      ),
    )
    .get();

  if (!targetModule) {
    throw new Error(`Source analysis not found for ${filePath}`);
  }

  const rows = db
    .select({
      name: schema.symbol.name,
      type: schema.symbol.type,
      startLine: schema.symbol.sourceStartLine,
      endLine: schema.symbol.sourceEndLine,
      sourceSize: schema.symbol.computedBundledSize,
    })
    .from(schema.symbol)
    .where(eq(schema.symbol.moduleId, targetModule.id))
    .orderBy(asc(schema.symbol.sourceStartLine), asc(schema.symbol.sourceStartCol))
    .all();

  const fragments: SourceFragment[] = rows.map((fragment) => {
    const size = Number(fragment.sourceSize ?? 0);
    return {
      name: fragment.name ?? "(anonymous)",
      type: fragment.type ?? "unknown",
      startLine: fragment.startLine ?? 0,
      endLine: fragment.endLine ?? 0,
      sourceSize: size,
      sizeFormatted: formatBytes(size),
    };
  });

  return {
    filePath: targetModule.filePath ?? filePath,
    totalFragments: fragments.length,
    fragments,
  };
}

async function findFragment(
  context: NormalizedContext,
  searchTerm: string,
): Promise<FragmentSearchResult[]> {
  const { db, analysisId } = context;
  if (!searchTerm.trim()) {
    return [];
  }
  const pattern = `%${searchTerm.toLowerCase()}%`;

  const rows = db
    .select({
      filePath: schema.module.filePath,
      fragmentName: schema.symbol.name,
      type: schema.symbol.type,
      startLine: schema.symbol.sourceStartLine,
      endLine: schema.symbol.sourceEndLine,
      sourceSize: schema.symbol.computedBundledSize,
    })
    .from(schema.symbol)
    .innerJoin(schema.module, eq(schema.symbol.moduleId, schema.module.id))
    .where(
      and(
        eq(schema.module.analysisRunId, analysisId),
        sql`lower(${schema.symbol.name}) like ${pattern}`,
      ),
    )
    .all();

  return rows
    .map((row) => {
      const size = Number(row.sourceSize ?? 0);
      return {
        filePath: row.filePath ?? "(unknown source)",
        fragmentName: row.fragmentName ?? "(anonymous)",
        type: row.type ?? "unknown",
        startLine: row.startLine ?? 0,
        endLine: row.endLine ?? 0,
        sourceSize: size,
        sizeFormatted: formatBytes(size),
      };
    })
    .sort((a, b) => b.sourceSize - a.sourceSize);
}

function getBundleById(db: StoreDb, analysisId: number, bundleId: number) {
  const row = db
    .select({
      id: schema.bundle.id,
      fileName: schema.bundle.fileName,
      size: schema.bundle.size,
      gzipSize: schema.bundle.gzipSize,
    })
    .from(schema.bundle)
    .where(
      and(
        eq(schema.bundle.analysisRunId, analysisId),
        eq(schema.bundle.id, bundleId),
      ),
    )
    .get();

  if (!row) {
    throw new Error(`Bundle ${bundleId} not found in analysis ${analysisId}`);
  }

  return row;
}

function getBundleByName(db: StoreDb, analysisId: number, chunkName: string) {
  const row = db
    .select({
      id: schema.bundle.id,
      fileName: schema.bundle.fileName,
      size: schema.bundle.size,
    })
    .from(schema.bundle)
    .where(
      and(
        eq(schema.bundle.analysisRunId, analysisId),
        eq(schema.bundle.fileName, chunkName),
      ),
    )
    .get();

  if (!row) {
    throw new Error(`Chunk ${chunkName} was not found in analysis ${analysisId}`);
  }

  return row;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i] ?? "B"}`;
}
