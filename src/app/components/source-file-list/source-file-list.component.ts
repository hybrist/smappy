import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';

export interface SourceFileItem {
  path: string;
  size: number;
  displayName?: string;
  badge?: string;
  clickable?: boolean;
}

@Component({
  selector: 'app-source-file-list',
  imports: [RouterLink],
  template: `
    <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
      @for (file of files; track file.path) {
        <div
          class="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
        >
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
                @if (file.clickable !== false) {
                  <a
                    [routerLink]="['/bundle', bundleId(), 'sources', 'details']"
                    [queryParams]="{ p: file.path }"
                    class="hover:text-blue-600"
                  >
                    {{ file.displayName || getFileName(file.path) }}
                  </a>
                } @else {
                  {{ file.displayName || getFileName(file.path) }}
                }
              </div>
              <div class="text-sm text-gray-500 truncate">
                {{ file.path }}
              </div>
            </div>
          </div>
          <div class="text-right ml-4 flex items-center space-x-3">
            @if (file.badge) {
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {{ file.badge }}
              </span>
            }
            <div>
              <div class="text-sm font-medium text-gray-900">
                {{ formatSize(file.size) }}
              </div>
              <div class="text-sm text-gray-500">
                {{ getPercentageOfTotal(file.size) }}%
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class SourceFileListComponent {
  @Input() files: SourceFileItem[] = [];

  private readonly bundleService = inject(BundleService);

  protected readonly bundleId = this.bundleService.bundleId;

  getFileName(path: string): string {
    return path.split('/').pop() || path;
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
