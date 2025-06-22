import { Component, Input } from '@angular/core';

@Component({
  selector: 'section[appSourceAnalysis]',
  imports: [],
  template: `
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">File Analysis</h3>
      </div>
      <div class="px-6 py-4">
        <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt class="text-sm font-medium text-gray-500">File Type</dt>
            <dd class="text-sm text-gray-900">
              {{ getFileType(path) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Directory</dt>
            <dd class="text-sm text-gray-900">
              {{ getDirectory(path) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Is Node Module</dt>
            <dd class="text-sm text-gray-900">
              {{ isNodeModule(path) ? 'Yes' : 'No' }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Relative Size</dt>
            <dd class="text-sm text-gray-900">
              {{ getSizeCategory(size) }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  `,
  styles: [],
})
export class SourceAnalysisComponent {
  @Input() path!: string;
  @Input() size!: number;

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
}