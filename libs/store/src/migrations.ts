/**
 * Migration utilities for the store package
 * Handles applying migration files to initialize or update database schema
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the migrations directory
 * This should point to the migrations shared with the web app
 */
function getMigrationsDirectory(): string {
  // Look for migrations - first check if we have local migrations, then check web-sv
  const possiblePaths = [
    // Local migrations (if we copy them)
    join(__dirname, '..', 'drizzle'),
    // When running from monorepo root
    join(process.cwd(), 'apps', 'web-sv', 'drizzle'),
    // When running from libs/store
    join(process.cwd(), '..', '..', 'apps', 'web-sv', 'drizzle'),
    // When built, migrations might be packaged differently
    join(__dirname, '..', '..', '..', 'apps', 'web-sv', 'drizzle'),
  ];

  for (const path of possiblePaths) {
    try {
      const stat = statSync(path);
      if (stat.isDirectory()) {
        return path;
      }
    } catch {
      // Path doesn't exist, try next one
    }
  }

  // Fallback: return the first path and let the caller handle errors
  return possiblePaths[0];
}

/**
 * Apply all migration files to the database
 * @param client - The SQLite database client
 * @throws Error if migrations cannot be applied
 */
export function applyMigrations(client: Database.Database): void {
  try {
    const drizzleDir = getMigrationsDirectory();
    
    // Find all migration SQL files and sort them to apply in order
    const migrationFiles = readdirSync(drizzleDir)
      .filter((file) => {
        const filePath = join(drizzleDir, file);
        try {
          return file.endsWith('.sql') && statSync(filePath).isFile();
        } catch {
          return false;
        }
      })
      .sort();

    if (migrationFiles.length === 0) {
      console.warn('No migration files found in', drizzleDir);
      return;
    }

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
          try {
            client.exec(statement);
          } catch (error) {
            // Some statements might fail if tables already exist, which is okay
            // during initialization
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('already exists')) {
              throw error;
            }
          }
        }
      }
    }
  } catch (error) {
    // If migration file doesn't exist, that's okay for non-test environments
    // In production, migrations should be run via drizzle-kit migrate
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not apply migrations: ${errorMessage}`);
  }
}

