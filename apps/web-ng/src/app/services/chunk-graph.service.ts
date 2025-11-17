import { Injectable } from '@angular/core';
import {
  BundleAnalysis,
  ChunkGraph,
  ChunkGraphEdge,
  ChunkGraphNode,
  ChunkInfo,
} from '../models/bundle.models';

@Injectable({
  providedIn: 'root',
})
export class ChunkGraphService {
  /**
   * Generate a chunk import graph from bundle analysis
   */
  buildChunkGraph(bundle: BundleAnalysis): ChunkGraph {
    const edges = this.extractImportEdges(bundle);
    const nodes = this.buildNodes(bundle, edges);

    return { nodes, edges };
  }

  /**
   * Extract import edges from chunk code
   */
  private extractImportEdges(bundle: BundleAnalysis): ChunkGraphEdge[] {
    const edges: ChunkGraphEdge[] = [];
    const edgeSet = new Set<string>();

    for (const chunk of bundle.chunks) {
      const importStatements = this.parseImportStatements(chunk.content);

      for (const importPath of importStatements) {
        const targetChunk = this.findChunkByPath(
          bundle,
          importPath,
          chunk.fileName,
        );
        if (targetChunk) {
          // Create unique key: source->target:type
          const edgeKey = `${chunk.id}->${targetChunk.id}:${importPath.type}`;

          // Only add if we haven't seen this exact edge before
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edges.push({
              source: chunk.id,
              target: targetChunk.id,
              type: importPath.type,
            });
          }
        }
      }
    }

    return edges;
  }

  /**
   * Parse import statements from chunk code
   */
  private parseImportStatements(
    code: string,
  ): Array<{ path: string; type: 'static' | 'dynamic' }> {
    const imports: Array<{ path: string; type: 'static' | 'dynamic' }> = [];

    // Match static imports: import ... from "path" or import ... from './path'
    // This regex handles both minified and formatted code
    const staticImportRegex = /import[^"']+from\s*["']([^"']+)["']/g;
    let match;
    while ((match = staticImportRegex.exec(code)) !== null) {
      imports.push({ path: match[1], type: 'static' });
    }

    // Match dynamic imports: import("path") or import('./path')
    const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = dynamicImportRegex.exec(code)) !== null) {
      imports.push({ path: match[1], type: 'dynamic' });
    }

    return imports;
  }

  /**
   * Find a chunk by import path
   */
  private findChunkByPath(
    bundle: BundleAnalysis,
    importPath: { path: string; type: 'static' | 'dynamic' },
    currentChunkName: string,
  ): ChunkInfo | null {
    // Normalize the import path
    const normalizedPath = this.normalizeImportPath(
      importPath.path,
      currentChunkName,
    );

    // Try to match against chunk filenames
    for (const chunk of bundle.chunks) {
      const fileName = chunk.fileName;
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

      // Direct match
      if (fileName === normalizedPath) {
        return chunk;
      }

      // Match without extension (exact match)
      if (fileNameWithoutExt === normalizedPath) {
        return chunk;
      }

      // Match with "./" prefix (relative imports)
      if (normalizedPath.startsWith('./')) {
        const relativePath = normalizedPath.substring(2);
        if (fileNameWithoutExt === relativePath || fileName === relativePath) {
          return chunk;
        }
      }
    }

    return null;
  }

  /**
   * Normalize import path to match chunk filename patterns
   */
  private normalizeImportPath(path: string, currentChunkName: string): string {
    // Remove .js extension if present
    let normalized = path.replace(/\.js$/, '');

    // Handle relative imports like "./chunk-XXX" by extracting the chunk ID
    if (normalized.startsWith('./chunk-')) {
      const chunkId = normalized.substring(2); // Remove "./"
      return chunkId;
    }

    return normalized;
  }

  /**
   * Build nodes with metadata
   */
  private buildNodes(
    bundle: BundleAnalysis,
    edges: ChunkGraphEdge[],
  ): ChunkGraphNode[] {
    const importCounts = new Map<string, number>();
    const dependentCounts = new Map<string, number>();

    // Count imports and dependents
    for (const edge of edges) {
      importCounts.set(edge.source, (importCounts.get(edge.source) || 0) + 1);
      dependentCounts.set(
        edge.target,
        (dependentCounts.get(edge.target) || 0) + 1,
      );
    }

    // Build nodes
    const nodes: ChunkGraphNode[] = bundle.chunks.map((chunk) => ({
      id: chunk.id,
      fileName: chunk.fileName,
      size: chunk.size,
      importCount: importCounts.get(chunk.id) || 0,
      dependentCount: dependentCounts.get(chunk.id) || 0,
    }));

    return nodes;
  }
}
