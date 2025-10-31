import { getDatabase } from './db.js';

/**
 * Server-side storage service using SQLite
 */

export interface InputBundle {
  id: string;
  name: string;
  importedAt: number;
  files: InputBundleFile[];
}

export interface InputBundleFile {
  name: string;
  storagePath: string;
}

export class ServerStorageService {
  /**
   * Stores a bundle with its metadata and file contents
   */
  storeBundleWithFiles(
    bundle: InputBundle,
    fileContents: Map<string, string>
  ): string | null {
    const db = getDatabase();

    try {
      // Start transaction
      const transaction = db.transaction(() => {
        // Insert bundle metadata
        const insertBundle = db.prepare(`
          INSERT INTO bundles (id, name, imported_at)
          VALUES (?, ?, ?)
        `);
        insertBundle.run(bundle.id, bundle.name, bundle.importedAt);

        // Insert bundle files metadata
        const insertFile = db.prepare(`
          INSERT INTO bundle_files (bundle_id, name, storage_path)
          VALUES (?, ?, ?)
        `);
        for (const file of bundle.files) {
          insertFile.run(bundle.id, file.name, file.storagePath);
        }

        // Insert file contents
        const insertContent = db.prepare(`
          INSERT INTO file_contents (bundle_id, storage_path, content)
          VALUES (?, ?, ?)
        `);
        for (const [storagePath, content] of fileContents) {
          insertContent.run(bundle.id, storagePath, content);
        }
      });

      transaction();
      return bundle.id;
    } catch (error) {
      console.error('Failed to store bundle:', error);
      return null;
    }
  }

  /**
   * Loads bundle metadata by ID
   */
  loadBundleMetadata(bundleId: string): InputBundle | null {
    const db = getDatabase();

    try {
      // Get bundle metadata
      const bundleRow = db
        .prepare('SELECT * FROM bundles WHERE id = ?')
        .get(bundleId) as { id: string; name: string; imported_at: number } | undefined;

      if (!bundleRow) {
        return null;
      }

      // Get bundle files
      const fileRows = db
        .prepare('SELECT name, storage_path FROM bundle_files WHERE bundle_id = ?')
        .all(bundleId) as { name: string; storage_path: string }[];

      return {
        id: bundleRow.id,
        name: bundleRow.name,
        importedAt: bundleRow.imported_at,
        files: fileRows.map((row) => ({
          name: row.name,
          storagePath: row.storage_path,
        })),
      };
    } catch (error) {
      console.error('Failed to load bundle metadata:', error);
      return null;
    }
  }

  /**
   * Loads all file contents for a bundle
   */
  loadAllFileContents(bundleId: string): Map<string, string> {
    const db = getDatabase();
    const fileContents = new Map<string, string>();

    try {
      const contentRows = db
        .prepare('SELECT storage_path, content FROM file_contents WHERE bundle_id = ?')
        .all(bundleId) as { storage_path: string; content: string }[];

      for (const row of contentRows) {
        fileContents.set(row.storage_path, row.content);
      }
    } catch (error) {
      console.error('Failed to load file contents:', error);
    }

    return fileContents;
  }

  /**
   * Lists all stored bundles with their metadata
   */
  listAllBundles(): InputBundle[] {
    const db = getDatabase();
    const bundles: InputBundle[] = [];

    try {
      const bundleRows = db
        .prepare('SELECT id, name, imported_at FROM bundles ORDER BY imported_at DESC')
        .all() as { id: string; name: string; imported_at: number }[];

      for (const bundleRow of bundleRows) {
        const fileRows = db
          .prepare('SELECT name, storage_path FROM bundle_files WHERE bundle_id = ?')
          .all(bundleRow.id) as { name: string; storage_path: string }[];

        bundles.push({
          id: bundleRow.id,
          name: bundleRow.name,
          importedAt: bundleRow.imported_at,
          files: fileRows.map((row) => ({
            name: row.name,
            storagePath: row.storage_path,
          })),
        });
      }
    } catch (error) {
      console.error('Failed to list bundles:', error);
    }

    return bundles;
  }

  /**
   * Deletes a bundle and all its files
   */
  deleteBundleById(bundleId: string): boolean {
    const db = getDatabase();

    try {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM file_contents WHERE bundle_id = ?').run(bundleId);
        db.prepare('DELETE FROM bundle_files WHERE bundle_id = ?').run(bundleId);
        db.prepare('DELETE FROM bundles WHERE id = ?').run(bundleId);
      });

      transaction();
      return true;
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      return false;
    }
  }

  /**
   * Clears all stored data
   */
  clearAllData(): boolean {
    const db = getDatabase();

    try {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM file_contents').run();
        db.prepare('DELETE FROM bundle_files').run();
        db.prepare('DELETE FROM bundles').run();
      });

      transaction();
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }
}

export const serverStorageService = new ServerStorageService();
