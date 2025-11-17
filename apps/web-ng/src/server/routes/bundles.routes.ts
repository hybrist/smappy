import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { serverSourceAnalysisService } from '../database/source-analysis.service.js';
import { serverStorageService } from '../database/storage.service.js';

const router = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
  },
});

/**
 * POST /api/bundles
 * Upload and store a new bundle with its files
 */
router.post('/', upload.array('files'), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    // Process files into contents map
    const contents = new Map<string, string>();
    const bundleFiles: { name: string; storagePath: string }[] = [];

    for (const file of files) {
      const content = file.buffer.toString('utf-8');
      const storagePath = findUniqueStoragePath(file.originalname, contents);
      contents.set(storagePath, content);
      bundleFiles.push({
        name: file.originalname,
        storagePath,
      });
    }

    // Create bundle metadata
    const bundleId = randomUUID();
    const importedAt = Date.now();
    const bundleName = `Bundle ${new Date(importedAt).toLocaleString()}`;

    const bundle = {
      id: bundleId,
      name: bundleName,
      importedAt,
      files: bundleFiles,
    };

    // Store in database
    const savedBundleId = serverStorageService.storeBundleWithFiles(
      bundle,
      contents,
    );

    if (!savedBundleId) {
      res.status(500).json({ error: 'Failed to store bundle' });
      return;
    }

    res.status(201).json({ bundleId: savedBundleId });
  } catch (error) {
    console.error('Error storing bundle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/bundles
 * List all stored bundles
 */
router.get('/', (_req, res) => {
  try {
    const bundles = serverStorageService.listAllBundles();
    res.json(bundles);
  } catch (error) {
    console.error('Error listing bundles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/bundles/:id/files
 * Get all file contents for a bundle
 */
router.get('/:id/files', (req, res) => {
  try {
    const bundleId = req.params.id;
    const bundle = serverStorageService.loadBundleMetadata(bundleId);

    if (!bundle) {
      res.status(404).json({ error: 'Bundle not found' });
      return;
    }

    const fileContents = serverStorageService.loadAllFileContents(bundleId);

    // Convert Map to object for JSON response
    const filesObject: Record<string, string> = {};
    fileContents.forEach((content, path) => {
      filesObject[path] = content;
    });

    res.json(filesObject);
  } catch (error) {
    console.error('Error loading file contents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/bundles/:id/source-analysis/:filePath
 * Get source analysis for a specific file
 */
router.get('/:id/source-analysis/*filePath', (req, res) => {
  try {
    const bundleId = req.params.id;
    const filePath = (req.params as any).filePath;

    const fragments = serverSourceAnalysisService.loadSourceAnalysis(
      bundleId,
      filePath,
    );

    if (fragments === null) {
      res.status(404).json({ error: 'Source analysis not found' });
      return;
    }

    res.json(fragments);
  } catch (error) {
    console.error('Error loading source analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/bundles/:id
 * Get bundle metadata by ID
 */
router.get('/:id', (req, res) => {
  try {
    const bundleId = req.params.id;
    const bundle = serverStorageService.loadBundleMetadata(bundleId);

    if (!bundle) {
      res.status(404).json({ error: 'Bundle not found' });
      return;
    }

    res.json(bundle);
  } catch (error) {
    console.error('Error loading bundle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/bundles/:id
 * Delete a bundle
 */
router.delete('/:id', (req, res) => {
  try {
    const bundleId = req.params.id;
    const success = serverStorageService.deleteBundleById(bundleId);

    if (!success) {
      res.status(500).json({ error: 'Failed to delete bundle' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/bundles
 * Clear all bundles
 */
router.delete('/', (_req, res) => {
  try {
    const success = serverStorageService.clearAllData();

    if (!success) {
      res.status(500).json({ error: 'Failed to clear data' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to find a unique storage path
 */
function findUniqueStoragePath(
  originalFilename: string,
  existingPaths: Map<string, string>,
): string {
  let storagePath = originalFilename;
  let counter = 1;

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

export default router;
