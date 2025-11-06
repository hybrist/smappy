import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Support both SvelteKit $env and Node.js process.env for compatibility
// Use process.env for compatibility with non-SvelteKit contexts (e.g., tests, Playwright)
// In SvelteKit, environment variables are typically available via process.env as well
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = new Database(databaseUrl);

export const db = drizzle(client, { schema });
