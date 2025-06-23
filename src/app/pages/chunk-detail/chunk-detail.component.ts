import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';
import { SourceFileListComponent, SourceFileItem } from '../../components/source-file-list/source-file-list.component';

@Component({
  selector: 'app-chunk-detail',
  imports: [RouterLink, SourceFileListComponent],
  template: `
    @if (chunk(); as chunkData) {
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <a routerLink="/bundle/chunks" class="hover:text-blue-600"
                >Chunks</a
              >
              <span>/</span>
              <span class="text-gray-900">{{ chunkData.fileName }}</span>
            </nav>
            <h2 class="text-2xl font-bold text-gray-900">
              {{ chunkData.fileName }}
            </h2>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Chunk Size</div>
            <div class="text-2xl font-semibold text-gray-900">
              {{ formatSize(chunkData.size) }}
            </div>
          </div>
        </div>

        <!-- Chunk Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">File Size</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ formatSize(chunkData.size) }}
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
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">
                  Source Files
                </div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ chunkData.sourceMap?.sources?.length || 0 }}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center"
                >
                  @if (chunkData.sourceMap) {
                    <svg
                      class="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  } @else {
                    <svg
                      class="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  }
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">Source Map</div>
                <div class="text-sm font-semibold text-gray-900">
                  @if (chunkData.sourceMap) {
                    Available
                  } @else {
                    Not Available
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        @if (chunkData.sourceMap) {
          <!-- Source Map Details -->
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">
                Source Map Information
              </h3>
            </div>
            <div class="px-6 py-4">
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Version</dt>
                  <dd class="text-sm text-gray-900">
                    {{ chunkData.sourceMap.version }}
                  </dd>
                </div>
                @if (chunkData.sourceMap.file) {
                  <div>
                    <dt class="text-sm font-medium text-gray-500">File</dt>
                    <dd class="text-sm text-gray-900">
                      {{ chunkData.sourceMap.file }}
                    </dd>
                  </div>
                }
                @if (chunkData.sourceMap.sourceRoot) {
                  <div>
                    <dt class="text-sm font-medium text-gray-500">
                      Source Root
                    </dt>
                    <dd class="text-sm text-gray-900">
                      {{ chunkData.sourceMap.sourceRoot }}
                    </dd>
                  </div>
                }
                <div>
                  <dt class="text-sm font-medium text-gray-500">Names Count</dt>
                  <dd class="text-sm text-gray-900">
                    {{ chunkData.sourceMap.names.length }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Source Files -->
          <div class="bg-white rounded-lg shadow">
            <div
              class="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
            >
              <h3 class="text-lg font-medium text-gray-900">Source Files</h3>
              <span class="text-sm text-gray-500"
                >{{ chunkData.sourceMap.sources.length }} files</span
              >
            </div>
            <app-source-file-list [files]="sourceFileItems()" />
          </div>
        } @else {
          <!-- No Source Map -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="w-5 h-5 text-yellow-400"
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
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">
                  No Source Map Available
                </h3>
                <div class="mt-2 text-sm text-yellow-700">
                  <p>
                    This chunk doesn't have an associated source map, which
                    limits the analysis capabilities. Consider rebuilding your
                    bundle with source maps enabled for better insights.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Chunk Content Preview -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Content Preview</h3>
          </div>
          <div class="px-6 py-4">
            <pre
              class="text-xs text-gray-700 bg-gray-50 p-4 rounded overflow-x-auto max-h-64 overflow-y-auto"
              >{{ getContentPreview() }}</pre
            >
          </div>
        </div>
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Chunk not found</p>
        <a
          routerLink="/bundle/chunks"
          class="text-blue-600 hover:text-blue-800"
        >
          ← Back to chunks
        </a>
      </div>
    }
  `,
  styles: [],
})
export class ChunkDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bundleService = inject(BundleService);

  readonly chunk = computed(() => {
    const chunkId = this.route.snapshot.paramMap.get('chunkId');
    if (!chunkId) return null;
    return this.bundleService.getChunkById(chunkId);
  });

  readonly sourceFileItems = computed((): SourceFileItem[] => {
    const chunkData = this.chunk();
    if (!chunkData?.sourceMap?.sources) return [];

    return chunkData.sourceMap.sources
      .filter((source): source is string => source !== null)
      .map((source, index) => ({
        path: source,
        size: 0, // Chunk detail doesn't show individual file sizes
        displayName: this.getFileName(source),
        badge: this.hasSourceContent(index) ? 'Content Available' : undefined,
      }));
  });

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getFileName(path: string | null): string {
    if (path === null) return '(null)';
    return path.split('/').pop() || path;
  }

  hasSourceContent(index: number): boolean {
    const chunkData = this.chunk();
    if (!chunkData?.sourceMap?.sourcesContent) return false;
    return !!chunkData.sourceMap.sourcesContent[index];
  }

  getContentPreview(): string {
    const chunkData = this.chunk();
    if (!chunkData) return '';

    // Show first 1000 characters
    const preview = chunkData.content.substring(0, 1000);
    return (
      preview + (chunkData.content.length > 1000 ? '\n... (truncated)' : '')
    );
  }
}
