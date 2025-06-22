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
  template: `
    @if (bundle(); as bundleData) {
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Bundle Analysis</h2>
          <p class="text-gray-600">
            Advanced insights and optimization opportunities for your bundle
          </p>
        </div>

        <!-- Key Insights -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">Large Files</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ getLargeFilesCount() }}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">
                  Node Modules %
                </div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ getNodeModulesPercentage() }}%
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">File Types</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ getFileTypesCount() }}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">
                  Avg Chunk Size
                </div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ formatSize(getAverageChunkSize()) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Optimization Opportunities -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">
              Optimization Opportunities
            </h3>
          </div>
          <div class="divide-y divide-gray-200">
            @for (
              opportunity of optimizationOpportunities();
              track opportunity.title
            ) {
              <div class="px-6 py-4">
                <div class="flex items-start">
                  <div class="flex-shrink-0">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center"
                      [class]="getOpportunityColor(opportunity.impact)"
                    >
                      @switch (opportunity.impact) {
                        @case ('high') {
                          <svg
                            class="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clip-rule="evenodd"
                            ></path>
                          </svg>
                        }
                        @case ('medium') {
                          <svg
                            class="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clip-rule="evenodd"
                            ></path>
                          </svg>
                        }
                        @case ('low') {
                          <svg
                            class="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clip-rule="evenodd"
                            ></path>
                          </svg>
                        }
                      }
                    </div>
                  </div>
                  <div class="ml-4 flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-medium text-gray-900">
                        {{ opportunity.title }}
                      </h4>
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class]="getImpactBadgeColor(opportunity.impact)"
                      >
                        {{ opportunity.impact | titlecase }} Impact
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">
                      {{ opportunity.description }}
                    </p>
                    @if (opportunity.savings) {
                      <p class="text-sm text-green-600 mt-1 font-medium">
                        Potential savings: {{ formatSize(opportunity.savings) }}
                      </p>
                    }
                    @if (opportunity.files && opportunity.files.length > 0) {
                      <div class="mt-2">
                        <p class="text-xs text-gray-500 mb-1">
                          Affected files:
                        </p>
                        <div class="flex flex-wrap gap-1">
                          @for (
                            file of opportunity.files.slice(0, 3);
                            track file
                          ) {
                            <span
                              class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800"
                            >
                              {{ getFileName(file) }}
                            </span>
                          }
                          @if (opportunity.files.length > 3) {
                            <span
                              class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800"
                            >
                              +{{ opportunity.files.length - 3 }} more
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- File Type Breakdown -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">
              File Type Distribution
            </h3>
          </div>
          <div class="px-6 py-4">
            <div class="space-y-4">
              @for (fileType of fileTypeBreakdown(); track fileType.type) {
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div
                      class="w-4 h-4 rounded"
                      [style.background-color]="getFileTypeColor(fileType.type)"
                    ></div>
                    <span class="ml-3 text-sm font-medium text-gray-900">{{
                      fileType.type
                    }}</span>
                    <span class="ml-2 text-sm text-gray-500"
                      >({{ fileType.count }} files)</span
                    >
                  </div>
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        class="h-2 rounded-full"
                        [style.background-color]="
                          getFileTypeColor(fileType.type)
                        "
                        [style.width.%]="
                          (fileType.size / bundleData.totalSize) * 100
                        "
                      ></div>
                    </div>
                    <span
                      class="text-sm font-medium text-gray-900 w-16 text-right"
                      >{{ formatSize(fileType.size) }}</span
                    >
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
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
