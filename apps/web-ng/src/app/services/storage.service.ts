import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { InputBundle, InputBundleFile } from '../models/storage';

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
 * Storage service that communicates with the server API
 *
 * This service manages bundle storage using server-side SQLite database
 * via REST API calls to /api/bundles endpoints.
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/bundles';

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
      // Create FormData with files
      const formData = new FormData();

      for (const [storagePath, content] of fileContents) {
        // Find the original filename from bundle.files
        const file = bundle.files.find((f) => f.storagePath === storagePath);
        const fileName = file?.name || storagePath;

        // Create a Blob from the content and append to FormData
        const blob = new Blob([content], { type: 'text/plain' });
        formData.append('files', blob, fileName);
      }

      // Send to server
      const response = await firstValueFrom(
        this.http.post<{ bundleId: string }>(this.apiUrl, formData),
      );

      return response.bundleId;
    } catch (error) {
      console.warn('Failed to store bundle:', error);
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
      const bundle = await firstValueFrom(
        this.http.get<InputBundle>(`${this.apiUrl}/${bundleId}`),
      );
      return bundle;
    } catch (error) {
      console.warn('Failed to load bundle metadata:', error);
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
      const filesObject = await firstValueFrom(
        this.http.get<Record<string, string>>(
          `${this.apiUrl}/${bundleId}/files`,
        ),
      );

      // Convert object back to Map
      for (const [path, content] of Object.entries(filesObject)) {
        fileContents.set(path, content);
      }
    } catch (error) {
      console.warn('Failed to load file contents:', error);
    }

    return fileContents;
  }

  /**
   * Lists all stored bundles with their metadata
   * @returns Promise resolving to array of bundle metadata
   */
  async listAllBundles(): Promise<InputBundle[]> {
    try {
      const bundles = await firstValueFrom(
        this.http.get<InputBundle[]>(this.apiUrl),
      );
      return bundles;
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
      await firstValueFrom(this.http.delete(`${this.apiUrl}/${bundleId}`));
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
      await firstValueFrom(this.http.delete(this.apiUrl));
      return true;
    } catch (error) {
      console.warn('Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Loads pre-parsed source analysis fragments for a file
   * @param bundleId Bundle identifier
   * @param filePath Source file path
   * @returns Promise resolving to fragments array or null if not found
   */
  async loadSourceAnalysis(
    bundleId: string,
    filePath: string,
  ): Promise<any[] | null> {
    try {
      const fragments = await firstValueFrom(
        this.http.get<any[]>(
          `${this.apiUrl}/${bundleId}/source-analysis/${encodeURIComponent(filePath)}`,
        ),
      );
      return fragments;
    } catch (error: any) {
      // 404 means no pre-parsed analysis available, which is fine
      if (error.status === 404) {
        return null;
      }
      console.warn('Failed to load source analysis:', error);
      return null;
    }
  }
}
