/**
 * Database connection and initialization
 * Handles SQLite database connection with automatic schema initialization
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';
import { applyMigrations } from './migrations.ts';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { expandPath } from './utils.ts';

/**
 * Options for creating a database connection
 */
export interface DatabaseOptions {
  /** Path to the database file (defaults to ~/.smappy/analysis.db) */
  dbPath?: string;
  /** Whether to auto-apply migrations (defaults to true) */
  autoMigrate?: boolean;
}

/**
 * Resolve the database path from options and environment variables
 * Supports ~ expansion and SMAPPY_DB_PATH environment variable
 */
function resolveDatabasePath(options?: DatabaseOptions): string {
  // Check environment variable first
  const envPath = process.env['SMAPPY_DB_PATH'];
  if (envPath) {
    return expandPath(envPath);
  }

  // Use provided path or default to ~/.smappy/analysis.db
  const dbPath = options?.dbPath || join(homedir(), '.smappy', 'analysis.db');
  return expandPath(dbPath);
}

/**
 * Create and initialize a database connection
 * @param options - Database connection options
 * @returns Drizzle database instance
 */
export function createDatabase(options?: DatabaseOptions): {
  db: BetterSQLite3Database<typeof schema>;
  client: Database.Database;
} {
  const dbPath = resolveDatabasePath(options);

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection
  const client = new Database(dbPath);

  // Check if database is empty (no tables)
  const tables = client
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  const isEmpty = tables.length === 0;

  // Apply migrations if needed
  const shouldAutoMigrate = options?.autoMigrate !== false;
  if (shouldAutoMigrate && (dbPath === ':memory:' || isEmpty)) {
    try {
      applyMigrations(client);
    } catch (error) {
      // Log warning but don't fail - migrations might not be available in all contexts
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn('Could not auto-apply migrations:', errorMessage);
      console.warn(
        'In production, run migrations manually via drizzle-kit migrate',
      );
    }
  }

  const db = drizzle(client, { schema });

  return { db, client };
}
