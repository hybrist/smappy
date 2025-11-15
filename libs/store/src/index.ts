/**
 * @smappy/store - Persistence layer for CLI analysis results
 * 
 * Provides a simple API for storing and querying analysis results
 * in a user's home directory without polluting project directories.
 */

import { createDatabase, type DatabaseOptions } from './db.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import {
  listAnalysisRuns,
  getLatestAnalysisRun,
  getAnalysisRunById,
  saveAnalysisRun,
  pruneAnalysisRuns,
  type ListAnalysisRunsOptions,
  type PruneAnalysisRunsOptions,
  type SaveAnalysisRunInput,
  type SaveAnalysisRunResult,
  type AnalysisRunData,
} from './queries.js';

/**
 * Store instance providing access to analysis data
 */
export interface Store {
  /** Database instance (exposed for advanced queries) */
  db: BetterSQLite3Database<typeof schema>;
  
  /** List analysis runs with optional filtering */
  listAnalysisRuns: (options?: ListAnalysisRunsOptions) => AnalysisRunData[];
  
  /** Get the latest analysis run for a project */
  getLatestAnalysisRun: (projectName: string) => AnalysisRunData | null;
  
  /** Get an analysis run by ID */
  getAnalysisRunById: (id: number) => AnalysisRunData | null;
  
  /** Save a new analysis run */
  saveAnalysisRun: (data: SaveAnalysisRunInput) => SaveAnalysisRunResult;
  
  /** Prune old analysis runs */
  pruneAnalysisRuns: (options?: PruneAnalysisRunsOptions) => number;
  
  /** Close the database connection */
  close: () => void;
}

/**
 * Create a new store instance
 * 
 * @example
 * ```ts
 * const store = await createStore({
 *   dbPath: '~/.smappy/analysis.db', // default
 * });
 * 
 * // Save analysis results
 * await store.saveAnalysisRun({
 *   projectName: 'my-app',
 *   bundler: 'vite',
 *   bundles: [...],
 *   modules: [...],
 *   chunks: [...],
 * });
 * 
 * // Query historical data
 * const runs = store.listAnalysisRuns({ projectName: 'my-app', limit: 10 });
 * const latest = store.getLatestAnalysisRun('my-app');
 * 
 * // Cleanup old runs
 * store.pruneAnalysisRuns({ olderThanDays: 30, keepMinimum: 5 });
 * 
 * // Close when done
 * store.close();
 * ```
 * 
 * @param options - Store configuration options
 * @returns Store instance
 */
export function createStore(options?: DatabaseOptions): Store {
  const { db, client } = createDatabase(options);

  return {
    db,
    listAnalysisRuns: (opts) => listAnalysisRuns(db, opts),
    getLatestAnalysisRun: (projectName) => getLatestAnalysisRun(db, projectName),
    getAnalysisRunById: (id) => getAnalysisRunById(db, id),
    saveAnalysisRun: (data) => saveAnalysisRun(db, data),
    pruneAnalysisRuns: (opts) => pruneAnalysisRuns(db, opts),
    close: () => client.close(),
  };
}

// Re-export types for convenience
export type {
  DatabaseOptions,
  ListAnalysisRunsOptions,
  PruneAnalysisRunsOptions,
  SaveAnalysisRunInput,
  SaveAnalysisRunResult,
  AnalysisRunData,
};

// Re-export schema for advanced use cases
export { schema };

