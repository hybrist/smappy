import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';

@Component({
  selector: 'app-bundle-overview',
  imports: [RouterLink],
  template: `
    @if (bundle(); as bundleData) {
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Bundle Overview</h2>
        </div>

        <!-- Key Metrics -->
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
                      d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">Total Size</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ formatSize(bundleData.totalSize) }}
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
                      d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">Chunks</div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ bundleData.chunks.length }}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-500">
                  Source Files
                </div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ bundleData.sourceBreakdown.size }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chunks Summary -->
        <div class="bg-white rounded-lg shadow">
          <div
            class="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
          >
            <h3 class="text-lg font-medium text-gray-900">Chunks</h3>
            <a
              routerLink="/bundle/chunks"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all →
            </a>
          </div>
          <div class="divide-y divide-gray-200">
            @for (chunk of bundleData.chunks; track chunk.id) {
              <div class="px-6 py-4 flex items-center justify-between">
                <div class="flex items-center">
                  <div
                    class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    <svg
                      class="w-5 h-5 text-gray-600"
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
                      {{ chunk.fileName }}
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
                <div class="text-right">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatSize(chunk.size) }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ getPercentage(chunk.size, bundleData.totalSize) }}%
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Top Sources -->
        @if (topSources().length > 0) {
          <div class="bg-white rounded-lg shadow">
            <div
              class="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
            >
              <h3 class="text-lg font-medium text-gray-900">
                Largest Source Files
              </h3>
              <a
                routerLink="/bundle/sources"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all →
              </a>
            </div>
            <div class="divide-y divide-gray-200">
              @for (source of topSources(); track source[0]) {
                <div class="px-6 py-4 flex items-center justify-between">
                  <div class="flex items-center min-w-0 flex-1">
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
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </div>
                    <div class="ml-4 min-w-0 flex-1">
                      <div class="text-sm font-medium text-gray-900 truncate">
                        <a
                          [routerLink]="['/bundle/sources/details']"
                          [queryParams]="{ p: source[0] }"
                          >{{ getFileName(source[0]) }}</a
                        >
                      </div>
                      <div class="text-sm text-gray-500 truncate">
                        {{ source[0] }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ formatSize(source[1]) }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ getPercentage(source[1], bundleData.totalSize) }}%
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [],
})
export class BundleOverviewComponent {
  private readonly bundleService = inject(BundleService);

  readonly bundle = this.bundleService.bundle;

  topSources() {
    const bundle = this.bundle();
    if (!bundle) return [];

    return Array.from(bundle.sourceBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getPercentage(value: number, total: number): string {
    return ((value / total) * 100).toFixed(1);
  }

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
}
