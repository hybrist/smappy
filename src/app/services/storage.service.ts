import { Injectable } from '@angular/core';
import { InputBundle, validateInputBundle } from '../models/storage';
import { ZodError } from 'zod';

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
    fileContents: Map<string, string>
  ): Promise<string | null> {
    try {
      // Validate bundle structure
      validateInputBundle(bundle);
      
      const directoryHandle = await this.getDirectoryHandle();
      
      // Create bundle directory
      const bundleDirectoryHandle = await directoryHandle.getDirectoryHandle(
        bundle.id,
        { create: true }
      );
      
      // Store each file content
      for (const [storagePath, content] of fileContents) {
        // Validate that this storage path is referenced in the bundle
        const fileExists = bundle.files.some(file => file.storagePath === storagePath);
        if (!fileExists) {
          throw new Error(`Storage path ${storagePath} not found in bundle file list`);
        }
        
        const fileHandle = await bundleDirectoryHandle.getFileHandle(storagePath, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      }
      
      // Store metadata file
      const metadataFilename = `${bundle.id}.json`;
      const metadataHandle = await directoryHandle.getFileHandle(metadataFilename, {
        create: true,
      });
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
   * Loads file content for a specific bundle and storage path
   * @param bundleId Bundle identifier
   * @param storagePath Path within the bundle storage
   * @returns Promise resolving to file content or null if not found
   */
  async loadFileContent(bundleId: string, storagePath: string): Promise<string | null> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const bundleDirectoryHandle = await directoryHandle.getDirectoryHandle(bundleId);
      
      const fileHandle = await bundleDirectoryHandle.getFileHandle(storagePath);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      console.warn(`Failed to load file content for ${bundleId}/${storagePath}:`, error);
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
      const bundleDirectoryHandle = await directoryHandle.getDirectoryHandle(bundleId);
      
      // Load each file referenced in the bundle
      for (const file of bundle.files) {
        try {
          const fileHandle = await bundleDirectoryHandle.getFileHandle(file.storagePath);
          const fileObj = await fileHandle.getFile();
          const content = await fileObj.text();
          fileContents.set(file.storagePath, content);
        } catch (error) {
          console.warn(`Failed to load file ${file.storagePath} for bundle ${bundleId}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to load file contents for bundle ${bundleId}:`, error);
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
   * Checks if a bundle exists
   * @param bundleId Bundle identifier
   * @returns Promise resolving to true if bundle exists
   */
  async bundleExists(bundleId: string): Promise<boolean> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const metadataFilename = `${bundleId}.json`;
      await directoryHandle.getFileHandle(metadataFilename);
      return true;
    } catch {
      return false;
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
        console.debug(`Metadata file ${metadataFilename} not found during deletion`);
      }
      
      return true;
    } catch (error) {
      console.warn(`Failed to delete bundle ${bundleId}:`, error);
      return false;
    }
  }

  /**
   * Cleans up old bundles based on age
   * @returns Promise resolving to number of bundles cleaned up
   */
  async cleanupOldBundles(): Promise<number> {
    let cleanedUp = 0;
    
    try {
      const bundles = await this.listAllBundles();
      const now = Date.now();
      
      for (const bundle of bundles) {
        const age = now - bundle.importedAt;
        if (age > this.MAX_AGE_MS) {
          const success = await this.deleteBundleById(bundle.id);
          if (success) {
            cleanedUp++;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old bundles:', error);
    }
    
    return cleanedUp;
  }

  /**
   * Gets the age of a bundle in milliseconds
   * @param bundleId Bundle identifier
   * @returns Promise resolving to age in ms, or null if bundle not found
   */
  async getBundleAge(bundleId: string): Promise<number | null> {
    try {
      const bundle = await this.loadBundleMetadata(bundleId);
      if (!bundle) {
        return null;
      }
      
      return Date.now() - bundle.importedAt;
    } catch (error) {
      console.warn(`Failed to get bundle age for ${bundleId}:`, error);
      return null;
    }
  }

  /**
   * Gets storage statistics
   * @returns Promise resolving to storage statistics
   */
  async getStorageStats(): Promise<{
    totalBundles: number;
    totalFiles: number;
    oldestBundle: number | null;
    newestBundle: number | null;
  }> {
    try {
      const bundles = await this.listAllBundles();
      const totalBundles = bundles.length;
      
      if (totalBundles === 0) {
        return {
          totalBundles: 0,
          totalFiles: 0,
          oldestBundle: null,
          newestBundle: null,
        };
      }
      
      const totalFiles = bundles.reduce((sum, bundle) => sum + bundle.files.length, 0);
      const timestamps = bundles.map(bundle => bundle.importedAt);
      const oldestBundle = Math.min(...timestamps);
      const newestBundle = Math.max(...timestamps);
      
      return {
        totalBundles,
        totalFiles,
        oldestBundle,
        newestBundle,
      };
    } catch (error) {
      console.warn('Failed to get storage stats:', error);
      return {
        totalBundles: 0,
        totalFiles: 0,
        oldestBundle: null,
        newestBundle: null,
      };
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
        { create: true }
      );
    }
    return this.directoryHandle;
  }

  generateBundleId(): string {
    return crypto.randomUUID();
  }

  /**
   * Creates a storage path for a file, ensuring uniqueness
   * @param originalFilename Original filename
   * @param existingPaths Set of already used storage paths
   * @returns Unique storage path
   */
  createStoragePath(originalFilename: string, existingPaths: Set<string>): string {
    // Start with the original filename
    let storagePath = originalFilename;
    let counter = 1;
    
    // If path already exists, add a counter
    while (existingPaths.has(storagePath)) {
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
}
