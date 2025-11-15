import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { schema } from '@smappy/store';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Use process.env for environment variable access, which works in both SvelteKit and Node.js contexts
// In SvelteKit, environment variables are typically available via process.env as well
// (SvelteKit also exposes $env imports, but process.env is sufficient for compatibility)
const databaseUrl = process.env.DATABASE_URL || ':memory:';

const client = new Database(databaseUrl);

// Check if database is empty (no tables)
// Note: SQLite will create an empty database file if it doesn't exist yet
// This is intentional - we want to initialize schema for new databases
const tables = client.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const isEmpty = tables.length === 0;

// Initialize schema for in-memory databases or newly created/empty file-based databases
// For existing file-based databases with tables, migrations should be run via drizzle-kit
if (databaseUrl === ':memory:' || isEmpty) {
  try {
    const drizzleDir = join(process.cwd(), 'drizzle');
    // Find all migration SQL files and sort them to apply in order
    const migrationFiles = readdirSync(drizzleDir)
      .filter((file) => {
        const filePath = join(drizzleDir, file);
        return file.endsWith('.sql') && statSync(filePath).isFile();
      })
      .sort();

    // Apply all migrations in order
    for (const migrationFile of migrationFiles) {
      const migrationPath = join(drizzleDir, migrationFile);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Split by statement-breakpoint comments and execute each statement
      const statements = migrationSQL
        .split(/--> statement-breakpoint/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        if (statement) {
          client.exec(statement);
        }
      }
    }
  } catch (error) {
    // If migration file doesn't exist, that's okay for non-test environments
    // In production, migrations should be run via drizzle-kit migrate
    console.warn('Could not initialize schema from migration file:', error);
  }
}

export const db = drizzle(client, { schema });
