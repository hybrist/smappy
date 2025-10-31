import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SQLite Database module for storing bundle data
 *
 * Schema:
 * - bundles: Stores bundle metadata (id, name, importedAt)
 * - bundle_files: Stores file references (bundleId, name, storagePath)
 * - file_contents: Stores actual file content (bundleId, storagePath, content)
 */

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'smappy.db');
    dbInstance = new Database(dbPath);

    // Enable WAL mode for better concurrent access
    dbInstance.pragma('journal_mode = WAL');

    // Initialize schema
    initializeSchema(dbInstance);
  }

  return dbInstance;
}

function initializeSchema(db: Database.Database): void {
  // Create bundles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bundles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      imported_at INTEGER NOT NULL
    );
  `);

  // Create bundle_files table (metadata about files)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bundle_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE
    );
  `);

  // Create file_contents table (actual file content)
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      content TEXT NOT NULL,
      FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
      UNIQUE(bundle_id, storage_path)
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bundle_files_bundle_id
    ON bundle_files(bundle_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_file_contents_bundle_id
    ON file_contents(bundle_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bundles_imported_at
    ON bundles(imported_at DESC);
  `);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Close database on process exit
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
