/**
 * Database connection for web-react-tan app
 * Sets up connection to SQLite database using Drizzle ORM
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { schema } from "@smappy/store";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Apply database migrations
 * This initializes the database schema by running migration files
 */
function applyMigrations(client: Database.Database): void {
  try {
    // Find migrations directory - check multiple possible locations
    const possiblePaths = [
      // When running from monorepo root
      join(process.cwd(), "apps", "web-sv", "drizzle"),
      // When running from apps/web-react-tan
      join(process.cwd(), "..", "web-sv", "drizzle"),
      // When built
      join(__dirname, "..", "..", "..", "web-sv", "drizzle"),
    ];

    let drizzleDir: string | null = null;
    for (const path of possiblePaths) {
      try {
        if (statSync(path).isDirectory()) {
          drizzleDir = path;
          break;
        }
      } catch {
        // Path doesn't exist, continue
      }
    }

    if (!drizzleDir) {
      console.warn("Migration directory not found, skipping migrations");
      return;
    }

    // Find all migration SQL files and sort them
    const migrationFiles = readdirSync(drizzleDir)
      .filter((file) => {
        try {
          const filePath = join(drizzleDir!, file);
          return file.endsWith(".sql") && statSync(filePath).isFile();
        } catch {
          return false;
        }
      })
      .sort();

    if (migrationFiles.length === 0) {
      console.warn("No migration files found");
      return;
    }

    // Apply migrations
    for (const migrationFile of migrationFiles) {
      const migrationPath = join(drizzleDir, migrationFile);
      const migrationSQL = readFileSync(migrationPath, "utf-8");

      // Split by statement-breakpoint and execute each statement
      const statements = migrationSQL
        .split(/--> statement-breakpoint/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        if (statement) {
          try {
            client.exec(statement);
          } catch (error) {
            // Ignore "already exists" errors
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes("already exists")) {
              throw error;
            }
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Could not apply migrations: ${errorMessage}`);
  }
}

/**
 * Database URL from environment or default to in-memory database
 * In production, set DATABASE_URL to a file path like 'local.db'
 */
const databaseUrl = process.env.DATABASE_URL || ":memory:";

const client = new Database(databaseUrl);

// Apply migrations for in-memory or empty databases
const tables = client
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();
const isEmpty = tables.length === 0;

if (databaseUrl === ":memory:" || isEmpty) {
  applyMigrations(client);
}

/**
 * Drizzle database instance with schema
 */
export const db = drizzle(client, { schema });

/**
 * Close the database connection
 * Should be called on server shutdown
 */
export function closeDatabase() {
  client.close();
}
