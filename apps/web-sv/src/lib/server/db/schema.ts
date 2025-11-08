import { integer, sqliteTable, text, primaryKey, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// A single analysis run, the root of all data
export const analysisRun = sqliteTable('AnalysisRun', {
  id: integer('id').primaryKey(),
  projectName: text('project_name'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  bundler: text('bundler'), // e.g., 'webpack', 'vite', 'rollup'
});

// The final generated files (e.g., main.js, vendor.css)
export const bundle = sqliteTable(
  'Bundle',
  {
    id: integer('id').primaryKey(),
    analysisRunId: integer('analysis_run_id')
      .notNull()
      .references(() => analysisRun.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(), // e.g., 'static/js/main.1a2b3c.js'
    fileType: text('file_type').notNull(), // 'javascript', 'css', 'image'
    size: integer('size').notNull(), // Raw size in bytes
    gzipSize: integer('gzip_size'), // Gzipped size in bytes
  },
  (table) => ({
    analysisRunIdx: index('idx_bundle_analysis_run').on(table.analysisRunId),
  }),
);

// A logical grouping of modules (e.g., 'main', 'vendors', 'AsyncComponent')
export const chunk = sqliteTable(
  'Chunk',
  {
    id: integer('id').primaryKey(),
    analysisRunId: integer('analysis_run_id')
      .notNull()
      .references(() => analysisRun.id, { onDelete: 'cascade' }),
    name: text('name'), // 'main', 'vendors', etc.
    totalSize: integer('total_size').notNull(), // Sum of modules within
    isEntry: integer('is_entry', { mode: 'boolean' }).notNull().default(false),
    isAsync: integer('is_async', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => ({
    analysisRunIdx: index('idx_chunk_analysis_run').on(table.analysisRunId),
  }),
);

// A single source file (e.g., Button.js, utils.css)
export const module = sqliteTable(
  'Module',
  {
    id: integer('id').primaryKey(),
    analysisRunId: integer('analysis_run_id')
      .notNull()
      .references(() => analysisRun.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(), // The original source path, e.g., 'src/components/Button.js'
    fileType: text('file_type').notNull(), // 'javascript', 'css', 'image'
    originalSize: integer('original_size').notNull(), // Size on disk

    // High-level aggregate size. More granular size is on Symbol.
    bundledSize: integer('bundled_size').notNull(),

    isThirdParty: integer('is_third_party', { mode: 'boolean' }).notNull().default(false),
    packageName: text('package_name'), // e.g., 'react', 'lodash'
    packageVersion: text('package_version'), // e.g., '18.2.0'

    // Storing as JSON text is efficient in SQLite
    exports: text('exports'), // JSON array of strings: ['Button', 'useButtonHook']
    usedExports: text('used_exports'), // JSON array of strings: ['Button']
  },
  (table) => ({
    analysisRunIdx: index('idx_module_analysis_run').on(table.analysisRunId),
    pathRunUnique: unique('idx_module_path_run').on(table.analysisRunId, table.filePath),
  }),
);

// The 'edge' in the graph: an 'import' statement
export const dependency = sqliteTable(
  'Dependency',
  {
    id: integer('id').primaryKey(),
    analysisRunId: integer('analysis_run_id')
      .notNull()
      .references(() => analysisRun.id, { onDelete: 'cascade' }),
    importerModuleId: integer('importer_module_id')
      .notNull()
      .references(() => module.id, { onDelete: 'cascade' }),
    importedModuleId: integer('imported_module_id')
      .notNull()
      .references(() => module.id, { onDelete: 'cascade' }),
    importType: text('import_type').notNull(), // 'static', 'dynamic'

    // JSON array of imported symbols: ['useState', 'useEffect']
    importedSymbols: text('imported_symbols'),
  },
  (table) => ({
    analysisRunIdx: index('idx_dependency_analysis_run').on(table.analysisRunId),
    importerIdx: index('idx_dependency_importer').on(table.importerModuleId),
    importedIdx: index('idx_dependency_imported').on(table.importedModuleId),
  }),
);

// A single function, class, or variable from the original source
export const symbol = sqliteTable(
  'Symbol',
  {
    id: integer('id').primaryKey(),
    moduleId: integer('module_id')
      .notNull()
      .references(() => module.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., 'calculatePrice', 'UserComponent'
    type: text('type').notNull(), // 'function', 'class', 'variable'

    // Location in original source file
    sourceStartLine: integer('source_start_line').notNull(),
    sourceStartCol: integer('source_start_col').notNull(),
    sourceEndLine: integer('source_end_line').notNull(),
    sourceEndCol: integer('source_end_col').notNull(),

    astHash: text('ast_hash'), // For detecting code duplication
    isExported: integer('is_exported', { mode: 'boolean' }).notNull().default(false),

    // The O(1) lookup fields, populated by your pre-computation step
    computedBundledSize: integer('computed_bundled_size').notNull().default(0),
    computedGzipSize: integer('computed_gzip_size').notNull().default(0),
  },
  (table) => ({
    moduleIdx: index('idx_symbol_analysis_run').on(table.moduleId),
    astHashIdx: index('idx_symbol_ast_hash').on(table.astHash),
  }),
);

// This table is populated *during* ingestion to calculate symbol sizes,
// and could potentially be truncated after if not needed for querying.
export const sourceMapEntry = sqliteTable(
  'SourceMapEntry',
  {
    id: integer('id').primaryKey(),
    bundleId: integer('bundle_id')
      .notNull()
      .references(() => bundle.id, { onDelete: 'cascade' }),
    symbolId: integer('symbol_id')
      .notNull()
      .references(() => symbol.id, { onDelete: 'cascade' }),

    // The size of *this specific fragment* in the bundle
    byteLength: integer('byte_length').notNull(),
  },
  (table) => ({
    symbolIdx: index('idx_sourcemap_symbol').on(table.symbolId),
  }),
);

// The AI-generated output
export const suggestion = sqliteTable(
  'Suggestion',
  {
    id: integer('id').primaryKey(),
    analysisRunId: integer('analysis_run_id')
      .notNull()
      .references(() => analysisRun.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'TREE_SHAKING', 'DUPLICATE_CODE', 'LARGE_DEPENDENCY'
    severity: text('severity').notNull(), // 'critical', 'warning', 'info'
    title: text('title').notNull(),
    description: text('description').notNull(), // The full AI explanation
  },
  (table) => ({
    analysisRunIdx: index('idx_suggestion_analysis_run').on(table.analysisRunId),
  }),
);

// Junction table: Links modules to the chunks they are part of (Many-to-Many)
export const chunkModule = sqliteTable(
  'Chunk_Module',
  {
    chunkId: integer('chunk_id')
      .notNull()
      .references(() => chunk.id, { onDelete: 'cascade' }),
    moduleId: integer('module_id')
      .notNull()
      .references(() => module.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chunkId, table.moduleId] }),
  }),
);

// Junction table: Links AI suggestions to the specific items they refer to
// This "polymorphic" table can link a suggestion to a module, symbol, etc.
export const suggestionLink = sqliteTable(
  'Suggestion_Link',
  {
    suggestionId: integer('suggestion_id')
      .notNull()
      .references(() => suggestion.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // 'Module', 'Symbol', 'Dependency', 'Chunk'
    entityId: integer('entity_id').notNull(), // The ID of the item
  },
  (table) => ({
    pk: primaryKey({ columns: [table.suggestionId, table.entityType, table.entityId] }),
    entityIdx: index('idx_suggestion_link_entity').on(table.entityType, table.entityId),
  }),
);
