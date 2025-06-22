import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChunkInfo } from '../../models/bundle.models';

@Component({
  selector: 'section[appSourceChunksList]',
  imports: [RouterLink],
  template: `
    @if (chunks.length > 0) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            Chunks containing this file ({{ chunks.length }})
          </h3>
        </div>
        <div class="divide-y divide-gray-200">
          @for (chunk of chunks; track chunk.id) {
            <div class="px-6 py-4 flex items-center justify-between">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">
                    <a [routerLink]="['/bundle/chunks', chunk.id]" class="hover:text-blue-600">
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
  `,
  styles: [],
})
export class SourceChunksListComponent {
  @Input() chunks!: ChunkInfo[];

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}