import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'section[appSourceDetailHeader]',
  imports: [RouterLink],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          <a routerLink="/bundle/sources" class="hover:text-blue-600">Sources</a>
          <span>/</span>
          <span class="text-gray-900">{{ getFileName(path) }}</span>
        </nav>
        <h2 class="text-2xl font-bold text-gray-900">
          {{ getFileName(path) }}
        </h2>
        <p class="text-sm text-gray-500 mt-1">{{ path }}</p>
      </div>
      <div class="text-right">
        <div class="text-sm text-gray-500">File Size</div>
        <div class="text-2xl font-semibold text-gray-900">
          {{ formatSize(size) }}
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class SourceDetailHeaderComponent {
  @Input() path!: string;
  @Input() size!: number;

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