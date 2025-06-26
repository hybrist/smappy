import { Component, inject, computed } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { BundleService } from '../../services/bundle.service';

interface OptimizationOpportunity {
  type: 'large-file' | 'node-modules' | 'source-maps' | 'chunk-size';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  files?: string[];
  savings?: number;
}

@Component({
  selector: 'app-analysis-overview',
  imports: [TitleCasePipe],
  templateUrl: './analysis-overview.component.html',
  styles: [],
})
export class AnalysisOverviewComponent {
  private readonly bundleService = inject(BundleService);

  readonly bundle = this.bundleService.bundle;

  readonly optimizationOpportunities = computed(
    (): OptimizationOpportunity[] => {
      const bundle = this.bundle();
      if (!bundle) return [];

      const opportunities: OptimizationOpportunity[] = [];

      // Large files analysis
      const largeFiles = Array.from(bundle.sourceBreakdown.entries())
        .filter(([_, size]) => size > 100 * 1024) // Files > 100KB
        .sort((a, b) => b[1] - a[1]);

      if (largeFiles.length > 0) {
        const totalLargeFileSize = largeFiles.reduce(
          (sum, [_, size]) => sum + size,
          0,
        );
        opportunities.push({
          type: 'large-file',
          title: 'Large Files Detected',
          description: `${largeFiles.length} files are larger than 100KB. Consider code splitting or optimization.`,
          impact: 'high',
          files: largeFiles.slice(0, 5).map(([path]) => path),
          savings: totalLargeFileSize * 0.3, // Estimate 30% savings
        });
      }

      // Node modules analysis
      const nodeModuleFiles = Array.from(
        bundle.sourceBreakdown.entries(),
      ).filter(([path]) => path.includes('node_modules'));

      if (nodeModuleFiles.length > 0) {
        const nodeModulesSize = nodeModuleFiles.reduce(
          (sum, [_, size]) => sum + size,
          0,
        );
        const percentage = (nodeModulesSize / bundle.totalSize) * 100;

        if (percentage > 70) {
          opportunities.push({
            type: 'node-modules',
            title: 'High Node Modules Usage',
            description: `Node modules make up ${percentage.toFixed(1)}% of your bundle. Consider tree shaking and eliminating unused dependencies.`,
            impact: 'high',
            files: nodeModuleFiles.slice(0, 5).map(([path]) => path),
            savings: nodeModulesSize * 0.2,
          });
        }
      }

      // Source maps analysis
      const chunksWithoutSourceMaps = bundle.chunks.filter(
        (chunk) => !chunk.sourceMap,
      );
      if (chunksWithoutSourceMaps.length > 0) {
        opportunities.push({
          type: 'source-maps',
          title: 'Missing Source Maps',
          description: `${chunksWithoutSourceMaps.length} chunks don't have source maps, limiting debugging capabilities.`,
          impact: 'medium',
          files: chunksWithoutSourceMaps.map((chunk) => chunk.fileName),
        });
      }

      // Chunk size analysis
      const largeChunks = bundle.chunks.filter(
        (chunk) => chunk.size > 1024 * 1024,
      ); // > 1MB
      if (largeChunks.length > 0) {
        opportunities.push({
          type: 'chunk-size',
          title: 'Large Chunks',
          description: `${largeChunks.length} chunks are larger than 1MB. Consider splitting for better loading performance.`,
          impact: 'medium',
          files: largeChunks.map((chunk) => chunk.fileName),
        });
      }

      return opportunities;
    },
  );

  readonly fileTypeBreakdown = computed(() => {
    const bundle = this.bundle();
    if (!bundle) return [];

    const typeMap = new Map<string, { count: number; size: number }>();

    for (const [path, size] of bundle.sourceBreakdown.entries()) {
      const extension = path.split('.').pop()?.toLowerCase() || 'unknown';
      const current = typeMap.get(extension) || { count: 0, size: 0 };
      typeMap.set(extension, {
        count: current.count + 1,
        size: current.size + size,
      });
    }

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.size - a.size);
  });

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  getLargeFilesCount(): number {
    const bundle = this.bundle();
    if (!bundle) return 0;
    return Array.from(bundle.sourceBreakdown.values()).filter(
      (size) => size > 100 * 1024,
    ).length;
  }

  getNodeModulesPercentage(): number {
    const bundle = this.bundle();
    if (!bundle) return 0;

    const nodeModulesSize = Array.from(bundle.sourceBreakdown.entries())
      .filter(([path]) => path.includes('node_modules'))
      .reduce((sum, [_, size]) => sum + size, 0);

    return Math.round((nodeModulesSize / bundle.totalSize) * 100);
  }

  getFileTypesCount(): number {
    const bundle = this.bundle();
    if (!bundle) return 0;

    const types = new Set<string>();
    for (const path of bundle.sourceBreakdown.keys()) {
      const extension = path.split('.').pop()?.toLowerCase();
      if (extension) types.add(extension);
    }
    return types.size;
  }

  getAverageChunkSize(): number {
    const bundle = this.bundle();
    if (!bundle || bundle.chunks.length === 0) return 0;
    return bundle.totalSize / bundle.chunks.length;
  }

  getOpportunityColor(impact: string): string {
    switch (impact) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  }

  getImpactBadgeColor(impact: string): string {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getFileTypeColor(type: string): string {
    const colors: Record<string, string> = {
      js: '#f1c40f',
      ts: '#3498db',
      css: '#e74c3c',
      html: '#e67e22',
      json: '#9b59b6',
      map: '#95a5a6',
      wasm: '#2ecc71',
      png: '#16a085',
      jpg: '#16a085',
      svg: '#8e44ad',
      unknown: '#bdc3c7',
    };
    return colors[type] || colors['unknown'];
  }
}
