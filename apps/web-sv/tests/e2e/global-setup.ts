/**
 * Global setup for Playwright e2e tests
 * Sets up a shared file-based database for E2E tests
 */

import { unlinkSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

async function globalSetup() {
  // Set DATABASE_URL for test processes to use the same database as the dev server
  process.env.DATABASE_URL = '.e2e-test.db';

  // Clean up any existing test database
  try {
    unlinkSync('.e2e-test.db');
  } catch {
    // Database might not exist, that's fine
  }

  // Initialize database schema from migrations
  const client = new Database('.e2e-test.db');

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
    console.error('Failed to initialize database schema:', error);
    throw error;
  } finally {
    client.close();
  }
}

export default globalSetup;
