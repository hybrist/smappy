import { Component, input, computed } from '@angular/core';
import {
  SourceFileListComponent,
  SourceFileItem,
} from '../source-file-list/source-file-list.component';

@Component({
  selector: 'section[appSimilarFiles]',
  imports: [SourceFileListComponent],
  template: `
    @if (similarFiles().length > 0) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            Similar Files ({{ getFileType(path()) }})
          </h3>
        </div>
        <app-source-file-list [files]="fileItems()" />
      </div>
    }
  `,
  styles: [],
})
export class SimilarFilesComponent {
  similarFiles = input.required<[string, number][]>();
  path = input.required<string>();

  readonly fileItems = computed((): SourceFileItem[] => {
    return this.similarFiles().map(([path, size]) => ({
      path,
      size,
    }));
  });

  getFileType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
}
