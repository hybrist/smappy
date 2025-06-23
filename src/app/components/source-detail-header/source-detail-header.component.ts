import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';

@Component({
  selector: 'section[appSourceDetailHeader]',
  imports: [RouterLink],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          <a routerLink="/bundle/sources" class="hover:text-blue-600"
            >Sources</a
          >
          <span>/</span>
          <span class="text-gray-900">{{ getFileName(path()) }}</span>
        </nav>
        <h2 class="text-2xl font-bold text-gray-900">
          {{ getFileName(path()) }}
        </h2>
        <p class="text-sm text-gray-500 mt-1">{{ path() }}</p>
      </div>
      <div class="text-right">
        <div class="text-2xl font-semibold text-gray-900">
          {{ formatSize(size()) }}
        </div>
        <div class="text-sm text-gray-500">
          <strong class="text-gray-600">{{ percentage() }}%</strong> of bundle
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class SourceDetailHeaderComponent {
  readonly path = input.required<string>();
  readonly size = input.required<number>();

  private readonly bundleService = inject(BundleService);

  percentage = computed(() => {
    const bundle = this.bundleService.bundle();
    if (!bundle) return '0';
    return ((this.size() / bundle.totalSize) * 100).toFixed(1);
  });

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
}
