import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  SourceFileItem,
  SourceFileListComponent,
} from '../../components/source-file-list/source-file-list.component';
import { FormatSizePipe } from '../../pipes/format-size.pipe';
import { currentBundle } from '../../resolvers/bundle';
import { BundleCalculationService } from '../../services/bundle-calculation.service';

@Component({
  selector: 'app-chunk-detail',
  imports: [RouterLink, SourceFileListComponent, FormatSizePipe],
  template: `
    @let bundleId = bundle().value()?.bundleId;
    @if (chunk(); as chunkData) {
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <a
                [routerLink]="['/bundle', bundleId, 'chunks']"
                class="hover:text-blue-600"
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
              {{ chunkData.size | formatSize }}
            </div>
          </div>
        </div>

        @if (chunkData.sourceMap) {
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
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Chunk not found</p>
        <a
          [routerLink]="['/bundle', bundleId, 'chunks']"
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
  private readonly calc = inject(BundleCalculationService);

  protected readonly bundle = currentBundle();

  readonly chunk = computed(() => {
    const chunkId = this.route.snapshot.paramMap.get('chunkId');
    if (!chunkId) return null;
    return this.bundle()
      .value()!
      .chunks.find((chunk) => chunk.id === chunkId);
  });

  readonly sourceFileItems = computed((): SourceFileItem[] => {
    const chunkData = this.chunk();
    if (!chunkData?.sourceMap?.sources) return [];

    const analysis = this.calc.analyzeBundle('temp', [chunkData]);

    return chunkData.sourceMap.sources
      .filter((source): source is string => source !== null)
      .map((source, index) => ({
        path: source,
        size: analysis.sourceBreakdown.get(source) || 0,
        displayName: this.getFileName(source),
        badge: this.hasSourceContent(index) ? 'Content Available' : undefined,
      }))
      .sort((a, b) => b.size - a.size);
  });

  getFileName(path: string | null): string {
    if (path === null) return '(null)';
    return path.split('/').pop() || path;
  }

  hasSourceContent(index: number): boolean {
    const chunkData = this.chunk();
    if (!chunkData?.sourceMap?.sourcesContent) return false;
    return !!chunkData.sourceMap.sourcesContent[index];
  }
}
