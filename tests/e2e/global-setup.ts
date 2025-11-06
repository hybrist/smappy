/**
 * Global setup for Playwright e2e tests
 * Initializes the database schema before tests run
 */

import Database from 'better-sqlite3';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function globalSetup() {
	const databaseUrl = process.env.DATABASE_URL || ':memory:';
	const db = new Database(databaseUrl);

	// Read the migration SQL file
	const migrationPath = join(process.cwd(), 'drizzle', '0000_acoustic_wildside.sql');
	const migrationSQL = await readFile(migrationPath, 'utf-8');

	// Execute the migration to create tables
	// Split by statement-breakpoint comments
	const statements = migrationSQL
		.split(/--> statement-breakpoint/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		if (statement.trim()) {
			db.exec(statement);
		}
	}

	db.close();
}

export default globalSetup;
