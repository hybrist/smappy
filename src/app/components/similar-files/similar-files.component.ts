import { Component, Input } from '@angular/core';
import { BundleService } from '../../services/bundle.service';
import { inject } from '@angular/core';

@Component({
  selector: 'section[appSimilarFiles]',
  imports: [],
  template: `
    @if (similarFiles.length > 0) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            Similar Files ({{ getFileType(path) }})
          </h3>
        </div>
        <div class="divide-y divide-gray-200 max-h-64 overflow-y-auto">
          @for (file of similarFiles; track file[0]) {
            <div class="px-6 py-3 flex items-center justify-between">
              <div class="flex items-center min-w-0 flex-1">
                <div class="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
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
  `,
  styles: [],
})
export class SimilarFilesComponent {
  @Input() similarFiles!: [string, number][];
  @Input() path!: string;

  private readonly bundleService = inject(BundleService);

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  getFileType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getPercentageOfTotal(size: number): string {
    const bundle = this.bundleService.bundle();
    if (!bundle) return '0';
    return ((size / bundle.totalSize) * 100).toFixed(1);
  }
}