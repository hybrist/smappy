import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormatSizePipe } from '../../pipes/format-size.pipe';
import { currentBundle } from '../../resolvers/bundle';
import { BundleService } from '../../services/bundle.service';

@Component({
  selector: 'app-chunks-list',
  imports: [RouterLink, FormatSizePipe],
  template: `
    @if (bundle().value(); as bundleData) {
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">Chunks</h2>
          <div class="text-sm text-gray-500">
            {{ bundleData.chunks.length }} chunks •
            {{ bundleData.totalSize | formatSize }} total
          </div>
        </div>

        <div class="bg-white shadow overflow-hidden rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <div
              class="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <div class="col-span-4">File Name</div>
              <div class="col-span-2">Size</div>
              <div class="col-span-2">% of Total</div>
              <div class="col-span-2">Sources</div>
              <div class="col-span-2">Source Map</div>
            </div>
          </div>

          <div class="divide-y divide-gray-200">
            @for (chunk of sortedChunks(); track chunk.id) {
              <div class="px-6 py-4 hover:bg-gray-50">
                <div class="grid grid-cols-12 gap-4 items-center">
                  <div class="col-span-4">
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
                            [routerLink]="[
                              '/bundle',
                              bundleId(),
                              'chunks',
                              chunk.id,
                            ]"
                            class="hover:text-blue-600"
                          >
                            {{ chunk.fileName }}
                          </a>
                        </div>
                        <div class="text-sm text-gray-500">{{ chunk.id }}</div>
                      </div>
                    </div>
                  </div>

                  <div class="col-span-2">
                    <div class="text-sm font-medium text-gray-900">
                      {{ chunk.size | formatSize }}
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        class="bg-blue-600 h-2 rounded-full"
                        [style.width.%]="
                          getPercentage(chunk.size, bundleData.totalSize)
                        "
                      ></div>
                    </div>
                  </div>

                  <div class="col-span-2">
                    <div class="text-sm text-gray-900">
                      {{ getPercentage(chunk.size, bundleData.totalSize) }}%
                    </div>
                  </div>

                  <div class="col-span-2">
                    @if (chunk.sourceMap) {
                      <div class="text-sm text-gray-900">
                        {{ chunk.sourceMap.sources.length }}
                      </div>
                      <div class="text-xs text-gray-500">source files</div>
                    } @else {
                      <div class="text-sm text-gray-500">-</div>
                    }
                  </div>

                  <div class="col-span-2">
                    @if (chunk.sourceMap) {
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        Available
                      </span>
                    } @else {
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        Missing
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class ChunksListComponent {
  protected readonly bundle = currentBundle();
  protected readonly bundleId = computed(() => this.bundle().value()!.bundleId);

  protected readonly sortedChunks = computed(() => {
    const bundle = this.bundle().value()!;

    return [...bundle.chunks].sort((a, b) => b.size - a.size);
  });

  getPercentage(value: number, total: number): number {
    return Math.round((value / total) * 100 * 10) / 10;
  }
}
