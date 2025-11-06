import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Support both SvelteKit $env and Node.js process.env for compatibility
// Use process.env for compatibility with non-SvelteKit contexts (e.g., tests, Playwright)
// In SvelteKit, environment variables are typically available via process.env as well
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = new Database(databaseUrl);

// Initialize schema for in-memory databases (used in tests)
// For file-based databases, migrations should be run separately
if (databaseUrl === ':memory:') {
	try {
		const migrationPath = join(process.cwd(), 'drizzle', '0000_acoustic_wildside.sql');
		const migrationSQL = readFileSync(migrationPath, 'utf-8');

		// Split by statement-breakpoint comments and execute each statement
		const statements = migrationSQL
			.split(/--> statement-breakpoint/i)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		for (const statement of statements) {
			if (statement.trim()) {
				client.exec(statement);
			}
		}
	} catch (error) {
		// If migration file doesn't exist, that's okay for non-test environments
		// In production, migrations should be run via drizzle-kit migrate
		console.warn('Could not initialize schema from migration file:', error);
	}
}

export const db = drizzle(client, { schema });
