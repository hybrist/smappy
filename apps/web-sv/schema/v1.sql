BEGIN TRANSACTION;

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

--------------------------------------------------------------------------------
-- 1. TOP-LEVEL ENTITIES
--------------------------------------------------------------------------------

-- A single analysis run, the root of all data
CREATE TABLE AnalysisRun (
    id INTEGER PRIMARY KEY,
    project_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    bundler TEXT -- e.g., 'webpack', 'vite', 'rollup'
);

-- The final generated files (e.g., main.js, vendor.css)
CREATE TABLE Bundle (
    id INTEGER PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL,
    file_name TEXT NOT NULL, -- e.g., 'static/js/main.1a2b3c.js'
    file_type TEXT NOT NULL, -- 'javascript', 'css', 'image'
    size INTEGER NOT NULL, -- Raw size in bytes
    gzip_size INTEGER, -- Gzipped size in bytes

    FOREIGN KEY (analysis_run_id) REFERENCES AnalysisRun(id) ON DELETE CASCADE
);

-- A logical grouping of modules (e.g., 'main', 'vendors', 'AsyncComponent')
CREATE TABLE Chunk (
    id INTEGER PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL,
    name TEXT, -- 'main', 'vendors', etc.
    total_size INTEGER NOT NULL, -- Sum of modules within
    is_entry INTEGER NOT NULL DEFAULT 0, -- Boolean (0 or 1)
    is_async INTEGER NOT NULL DEFAULT 0, -- Boolean (0 or 1)

    FOREIGN KEY (analysis_run_id) REFERENCES AnalysisRun(id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 2. CORE GRAPH: MODULES AND DEPENDENCIES
--------------------------------------------------------------------------------

-- A single source file (e.g., Button.js, utils.css)
CREATE TABLE Module (
    id INTEGER PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL,
    file_path TEXT NOT NULL, -- The original source path, e.g., 'src/components/Button.js'
    file_type TEXT NOT NULL, -- 'javascript', 'css', 'image'
    original_size INTEGER NOT NULL, -- Size on disk

    -- High-level aggregate size. More granular size is on Symbol.
    bundled_size INTEGER NOT NULL,

    is_third_party INTEGER NOT NULL DEFAULT 0, -- Boolean
    package_name TEXT, -- e.g., 'react', 'lodash'
    package_version TEXT, -- e.g., '18.2.0'

    -- Storing as JSON text is efficient in SQLite
    exports TEXT, -- JSON array of strings: ['Button', 'useButtonHook']
    used_exports TEXT, -- JSON array of strings: ['Button']

    FOREIGN KEY (analysis_run_id) REFERENCES AnalysisRun(id) ON DELETE CASCADE
);

-- The 'edge' in the graph: an 'import' statement
CREATE TABLE Dependency (
    id INTEGER PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL,
    importer_module_id INTEGER NOT NULL, -- The file doing the importing
    imported_module_id INTEGER NOT NULL, -- The file being imported
    import_type TEXT NOT NULL, -- 'static', 'dynamic'

    -- JSON array of imported symbols: ['useState', 'useEffect']
    imported_symbols TEXT,

    FOREIGN KEY (analysis_run_id) REFERENCES AnalysisRun(id) ON DELETE CASCADE,
    FOREIGN KEY (importer_module_id) REFERENCES Module(id) ON DELETE CASCADE,
    FOREIGN KEY (imported_module_id) REFERENCES Module(id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 3. FINE-GRAINED (AST) ENTITIES
--------------------------------------------------------------------------------

-- A single function, class, or variable from the original source
CREATE TABLE Symbol (
    id INTEGER PRIMARY KEY,
    module_id INTEGER NOT NULL,
    name TEXT NOT NULL, -- e.g., 'calculatePrice', 'UserComponent'
    type TEXT NOT NULL, -- 'function', 'class', 'variable'

    -- Location in original source file
    source_start_line INTEGER NOT NULL,
    source_start_col INTEGER NOT NULL,
    source_end_line INTEGER NOT NULL,
    source_end_col INTEGER NOT NULL,

    ast_hash TEXT, -- For detecting code duplication
    is_exported INTEGER NOT NULL DEFAULT 0, -- Boolean

    -- The O(1) lookup fields, populated by your pre-computation step
    computed_bundled_size INTEGER NOT NULL DEFAULT 0,
    computed_gzip_size INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (module_id) REFERENCES Module(id) ON DELETE CASCADE
);

-- This table is populated *during* ingestion to calculate symbol sizes,
-- and could potentially be truncated after if not needed for querying.
CREATE TABLE SourceMapEntry (
    id INTEGER PRIMARY KEY,
    bundle_id INTEGER NOT NULL, -- Which output file this fragment is in
    symbol_id INTEGER NOT NULL, -- Which original symbol this maps to

    -- Note: We skip module_id, original_line, etc. because the
    -- 'symbol_id' link already contains that information.

    -- The size of *this specific fragment* in the bundle
    byte_length INTEGER NOT NULL,

    FOREIGN KEY (bundle_id) REFERENCES Bundle(id) ON DELETE CASCADE,
    FOREIGN KEY (symbol_id) REFERENCES Symbol(id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 4. AI ANALYSIS & JUNCTION TABLES
--------------------------------------------------------------------------------

-- The AI-generated output
CREATE TABLE Suggestion (
    id INTEGER PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'TREE_SHAKING', 'DUPLICATE_CODE', 'LARGE_DEPENDENCY'
    severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
    title TEXT NOT NULL,
    description TEXT NOT NULL, -- The full AI explanation

    FOREIGN KEY (analysis_run_id) REFERENCES AnalysisRun(id) ON DELETE CASCADE
);

-- Junction table: Links modules to the chunks they are part of (Many-to-Many)
CREATE TABLE Chunk_Module (
    chunk_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,

    PRIMARY KEY (chunk_id, module_id),
    FOREIGN KEY (chunk_id) REFERENCES Chunk(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES Module(id) ON DELETE CASCADE
);

-- Junction table: Links AI suggestions to the specific items they refer to
-- This "polymorphic" table can link a suggestion to a module, symbol, etc.
CREATE TABLE Suggestion_Link (
    suggestion_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL, -- 'Module', 'Symbol', 'Dependency', 'Chunk'
    entity_id INTEGER NOT NULL, -- The ID of the item

    PRIMARY KEY (suggestion_id, entity_type, entity_id),
    FOREIGN KEY (suggestion_id) REFERENCES Suggestion(id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 5. INDEXES FOR PERFORMANCE
--------------------------------------------------------------------------------

-- For finding all modules, dependencies, etc. for a given run
CREATE INDEX idx_module_analysis_run ON Module(analysis_run_id);
CREATE INDEX idx_dependency_analysis_run ON Dependency(analysis_run_id);
CREATE INDEX idx_symbol_analysis_run ON Symbol(module_id);
CREATE INDEX idx_chunk_analysis_run ON Chunk(analysis_run_id);
CREATE INDEX idx_bundle_analysis_run ON Bundle(analysis_run_id);
CREATE INDEX idx_suggestion_analysis_run ON Suggestion(analysis_run_id);

-- For fast graph traversal
CREATE INDEX idx_dependency_importer ON Dependency(importer_module_id);
CREATE INDEX idx_dependency_imported ON Dependency(imported_module_id);

-- For finding modules by path
CREATE UNIQUE INDEX idx_module_path_run ON Module(analysis_run_id, file_path);

-- For finding duplicate code
CREATE INDEX idx_symbol_ast_hash ON Symbol(ast_hash);

-- For linking suggestions
CREATE INDEX idx_suggestion_link_entity ON Suggestion_Link(entity_type, entity_id);

-- For the pre-computation step
CREATE INDEX idx_sourcemap_symbol ON SourceMapEntry(symbol_id);


COMMIT;
