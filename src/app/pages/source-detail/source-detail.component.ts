import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-source-detail',
  imports: [RouterLink],
  template: `
    @if (sourceInfo(); as info) {
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <a routerLink="/bundle/sources" class="hover:text-blue-600"
                >Sources</a
              >
              <span>/</span>
              <span class="text-gray-900">{{ getFileName(info.path) }}</span>
            </nav>
            <h2 class="text-2xl font-bold text-gray-900">
              {{ getFileName(info.path) }}
            </h2>
            <p class="text-sm text-gray-500 mt-1">{{ info.path }}</p>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">File Size</div>
            <div class="text-2xl font-semibold text-gray-900">
              {{ formatSize(info.size) }}
            </div>
          </div>
        </div>

        <!-- File Info Cards -->
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
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">File Size</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ formatSize(info.size) }}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">% of Bundle</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ getPercentage(info.size) }}%
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
                <div class="text-sm font-medium text-gray-500">In Chunks</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ info.chunks.length }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chunks containing this source -->
        @if (info.chunks.length > 0) {
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">
                Chunks containing this file ({{ info.chunks.length }})
              </h3>
            </div>
            <div class="divide-y divide-gray-200">
              @for (chunk of info.chunks; track chunk.id) {
                <div class="px-6 py-4 flex items-center justify-between">
                  <div class="flex items-center">
                    <div
                      class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-blue-600"
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
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        <a
                          [routerLink]="['/bundle/chunks', chunk.id]"
                          class="hover:text-blue-600"
                        >
                          {{ chunk.fileName }}
                        </a>
                      </div>
                      <div class="text-sm text-gray-500">{{ chunk.id }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">
                      {{ formatSize(chunk.size) }}
                    </div>
                    <div class="text-sm text-gray-500">
                      @if (chunk.sourceMap) {
                        {{ chunk.sourceMap.sources.length }} sources
                      } @else {
                        No source map
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Source Code -->
        @if (sourceContent(); as content) {
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Source Code</h3>
            </div>
            <div class="px-6 py-4">
              <pre
                class="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm font-mono border max-h-lvh overflow-y-auto"
              ><code>{{ content }}</code></pre>
            </div>
          </div>
        } @else {
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Source Code</h3>
            </div>
            <div class="px-6 py-4">
              <div class="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>Source content not available</p>
                <p class="text-sm mt-1">
                  This source file does not have embedded source content in the
                  source map.
                </p>
              </div>
            </div>
          </div>
        }

        <!-- File type analysis -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">File Analysis</h3>
          </div>
          <div class="px-6 py-4">
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt class="text-sm font-medium text-gray-500">File Type</dt>
                <dd class="text-sm text-gray-900">
                  {{ getFileType(info.path) }}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Directory</dt>
                <dd class="text-sm text-gray-900">
                  {{ getDirectory(info.path) }}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">
                  Is Node Module
                </dt>
                <dd class="text-sm text-gray-900">
                  {{ isNodeModule(info.path) ? 'Yes' : 'No' }}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Relative Size</dt>
                <dd class="text-sm text-gray-900">
                  {{ getSizeCategory(info.size) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Similar files -->
        @if (similarFiles().length > 0) {
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">
                Similar Files ({{ getFileType(info.path) }})
              </h3>
            </div>
            <div class="divide-y divide-gray-200 max-h-64 overflow-y-auto">
              @for (file of similarFiles(); track file[0]) {
                <div class="px-6 py-3 flex items-center justify-between">
                  <div class="flex items-center min-w-0 flex-1">
                    <div
                      class="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center"
                    >
                      <svg
                        class="w-4 h-4 text-gray-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </div>
                    <div class="ml-3 min-w-0 flex-1">
                      <div class="text-sm font-medium text-gray-900 truncate">
                        {{ getFileName(file[0]) }}
                      </div>
                      <div class="text-sm text-gray-500 truncate">
                        {{ file[0] }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ formatSize(file[1]) }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ getPercentageOfTotal(file[1]) }}%
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Source file not found</p>
        <a
          routerLink="/bundle/sources"
          class="text-blue-600 hover:text-blue-800"
        >
          ← Back to sources
        </a>
      </div>
    }
  `,
  styles: [],
})
export class SourceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bundleService = inject(BundleService);

  private readonly queryParams = toSignal(this.route.queryParams);
  private readonly sourcePath = computed<string | undefined>(() => {
    return this.queryParams()?.['p'];
  });

  readonly sourceInfo = computed(() => {
    const sourcePath = this.sourcePath();
    const bundle = this.bundleService.bundle();

    if (!bundle || !sourcePath) return null;

    const size = bundle.sourceBreakdown.get(sourcePath);
    if (size === undefined) return null;

    const chunks = this.bundleService.getChunksBySource(sourcePath);

    return {
      path: sourcePath,
      size,
      chunks,
    };
  });

  readonly similarFiles = computed(() => {
    const info = this.sourceInfo();
    const bundle = this.bundleService.bundle();
    if (!info || !bundle) return [];

    const fileType = this.getFileType(info.path);

    return Array.from(bundle.sourceBreakdown.entries())
      .filter(
        ([path]) => path !== info.path && this.getFileType(path) === fileType,
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  });

  readonly sourceContent = computed<string | null>(() => {
    const info = this.sourceInfo();
    if (!info) return null;
    return this.bundleService.getSourceContent(info.path);
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

  getFileType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  getDirectory(path: string): string {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/') || '/';
  }

  isNodeModule(path: string): boolean {
    return path.includes('node_modules');
  }

  getSizeCategory(size: number): string {
    if (size < 1024) return 'Very Small';
    if (size < 10 * 1024) return 'Small';
    if (size < 100 * 1024) return 'Medium';
    if (size < 1024 * 1024) return 'Large';
    return 'Very Large';
  }

  getPercentage(size: number): string {
    const bundle = this.bundleService.bundle();
    if (!bundle) return '0';
    return ((size / bundle.totalSize) * 100).toFixed(1);
  }

  getPercentageOfTotal(size: number): string {
    const bundle = this.bundleService.bundle();
    if (!bundle) return '0';
    return ((size / bundle.totalSize) * 100).toFixed(1);
  }
}
