/**
 * Database connection for web-react-tan app
 * Sets up connection to SQLite database using Drizzle ORM
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { schema } from "@smappy/store";

/**
 * Database URL from environment or default to in-memory database
 * In production, set DATABASE_URL to a file path like 'local.db'
 */
const databaseUrl = process.env.DATABASE_URL || ":memory:";

const client = new Database(databaseUrl);

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
