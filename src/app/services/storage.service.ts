import { Injectable } from '@angular/core';
import { ZodError } from 'zod';
import {
  InputBundle,
  InputBundleFile,
  validateInputBundle,
} from '../models/storage';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

function findMapKeyForFile<T>(
  originalFilename: string,
  contents: Map<string, T>,
): string {
  // Start with the original filename
  let storagePath = originalFilename;
  let counter = 1;

  // If path already exists, add a counter
  while (contents.has(storagePath)) {
    const lastDotIndex = originalFilename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      storagePath = `${originalFilename}-${counter}`;
    } else {
      const name = originalFilename.substring(0, lastDotIndex);
      const extension = originalFilename.substring(lastDotIndex);
      storagePath = `${name}-${counter}${extension}`;
    }
    counter++;
  }

  return storagePath;
}

export async function inputBundleFromUpload(
  uploadFiles: File[],
): Promise<[InputBundle, Map<string, string>]> {
  const contents = new Map<string, string>();
  const files: InputBundleFile[] = [];

  for (const file of uploadFiles) {
    const chunkContent = await readFileAsText(file);
    const chunkStoragePath = findMapKeyForFile(file.name, contents);
    contents.set(chunkStoragePath, chunkContent);
    files.push({
      name: file.name,
      storagePath: chunkStoragePath,
    });
  }

  const importedAt = new Date();
  const bundleId = crypto.randomUUID();
  const bundleName = `Bundle ${importedAt.toLocaleString()}`;

  return [
    {
      id: bundleId,
      name: bundleName,
      importedAt: importedAt.getTime(),
      files,
    },
    contents,
  ];
}

/**
 * Storage service implementing the file system layout described in README.md
 *
 * File System Layout:
 * - Metadata: smappy/<uuid>.json (contains InputBundle)
 * - File Contents: smappy/<uuid>/<storagePath>
 *
 * This service manages the separation between metadata and file contents,
 * using the Origin Private File System (OPFS) for persistence.
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly STORAGE_DIRECTORY = 'smappy';
  private readonly MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  /**
   * Stores a bundle with its metadata and file contents
   * @param bundle Bundle metadata
   * @param fileContents Map of storage path to file content
   * @returns Promise resolving to the bundle ID on success, null on failure
   */
  async storeBundleWithFiles(
    bundle: InputBundle,
    fileContents: Map<string, string>,
  ): Promise<string | null> {
    try {
      // Validate bundle structure
      validateInputBundle(bundle);

      const directoryHandle = await this.getDirectoryHandle();

      // Create bundle directory
      const bundleDirectoryHandle = await directoryHandle.getDirectoryHandle(
        bundle.id,
        { create: true },
      );

      // Store each file content
      for (const [storagePath, content] of fileContents) {
        // Validate that this storage path is referenced in the bundle
        const fileExists = bundle.files.some(
          (file) => file.storagePath === storagePath,
        );
        if (!fileExists) {
          throw new Error(
            `Storage path ${storagePath} not found in bundle file list`,
          );
        }

        const fileHandle = await bundleDirectoryHandle.getFileHandle(
          storagePath,
          {
            create: true,
          },
        );
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      }

      // Store metadata file
      const metadataFilename = `${bundle.id}.json`;
      const metadataHandle = await directoryHandle.getFileHandle(
        metadataFilename,
        {
          create: true,
        },
      );
      const metadataWritable = await metadataHandle.createWritable();
      await metadataWritable.write(JSON.stringify(bundle, null, 2));
      await metadataWritable.close();

      return bundle.id;
    } catch (error) {
      console.warn('Failed to store bundle:', error);

      // Clean up on failure
      try {
        await this.deleteBundleById(bundle.id);
      } catch (cleanupError) {
        console.warn('Failed to cleanup after storage failure:', cleanupError);
      }

      return null;
    }
  }

  /**
   * Loads bundle metadata by ID
   * @param bundleId Bundle identifier
   * @returns Promise resolving to InputBundle or null if not found
   */
  async loadBundleMetadata(bundleId: string): Promise<InputBundle | null> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const metadataFilename = `${bundleId}.json`;

      const fileHandle = await directoryHandle.getFileHandle(metadataFilename);
      const file = await fileHandle.getFile();
      const content = await file.text();

      const parsedBundle = JSON.parse(content);
      return validateInputBundle(parsedBundle);
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn('Bundle metadata validation failed:', error);
      } else {
        console.warn('Failed to load bundle metadata:', error);
      }
      return null;
    }
  }

  /**
   * Loads all file contents for a bundle
   * @param bundleId Bundle identifier
   * @returns Promise resolving to Map of storage path to content
   */
  async loadAllFileContents(bundleId: string): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();

    try {
      const bundle = await this.loadBundleMetadata(bundleId);
      if (!bundle) {
        return fileContents;
      }

      const directoryHandle = await this.getDirectoryHandle();
      const bundleDirectoryHandle =
        await directoryHandle.getDirectoryHandle(bundleId);

      // Load each file referenced in the bundle
      for (const file of bundle.files) {
        try {
          const fileHandle = await bundleDirectoryHandle.getFileHandle(
            file.storagePath,
          );
          const fileObj = await fileHandle.getFile();
          const content = await fileObj.text();
          fileContents.set(file.storagePath, content);
        } catch (error) {
          console.warn(
            `Failed to load file ${file.storagePath} for bundle ${bundleId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.warn(
        `Failed to load file contents for bundle ${bundleId}:`,
        error,
      );
    }

    return fileContents;
  }

  /**
   * Lists all stored bundles with their metadata
   * @returns Promise resolving to array of bundle metadata
   */
  async listAllBundles(): Promise<InputBundle[]> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const bundles: InputBundle[] = [];

      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file' && name.endsWith('.json')) {
          const bundleId = name.replace('.json', '');
          const bundle = await this.loadBundleMetadata(bundleId);
          if (bundle) {
            bundles.push(bundle);
          }
        }
      }

      // Sort by import time (newest first)
      return bundles.sort((a, b) => b.importedAt - a.importedAt);
    } catch (error) {
      console.warn('Failed to list bundles:', error);
      return [];
    }
  }

  /**
   * Deletes a bundle and all its files
   * @param bundleId Bundle identifier
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteBundleById(bundleId: string): Promise<boolean> {
    try {
      const directoryHandle = await this.getDirectoryHandle();

      // Delete bundle directory (and all its files)
      try {
        await directoryHandle.removeEntry(bundleId, { recursive: true });
      } catch (error) {
        // Directory might not exist, which is fine
        console.debug(`Bundle directory ${bundleId} not found during deletion`);
      }

      // Delete metadata file
      const metadataFilename = `${bundleId}.json`;
      try {
        await directoryHandle.removeEntry(metadataFilename);
      } catch (error) {
        console.debug(
          `Metadata file ${metadataFilename} not found during deletion`,
        );
      }

      return true;
    } catch (error) {
      console.warn(`Failed to delete bundle ${bundleId}:`, error);
      return false;
    }
  }

  /**
   * Clears all stored data
   * @returns Promise resolving to true if successful
   */
  async clearAllData(): Promise<boolean> {
    try {
      const directoryHandle = await this.getDirectoryHandle();

      // Remove all entries
      for await (const [name] of directoryHandle.entries()) {
        await directoryHandle.removeEntry(name, { recursive: true });
      }

      return true;
    } catch (error) {
      console.warn('Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Gets or creates the main storage directory handle
   * @returns Promise resolving to directory handle
   */
  private async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    if (!this.directoryHandle) {
      const opfsRoot = await navigator.storage.getDirectory();
      this.directoryHandle = await opfsRoot.getDirectoryHandle(
        this.STORAGE_DIRECTORY,
        { create: true },
      );
    }
    return this.directoryHandle;
  }
}
