import { Component, Input } from '@angular/core';

export interface SourceLine {
  line: number;
  content: string;
  size: number;
}

@Component({
  selector: 'section[appSourceCodeViewer]',
  imports: [],
  template: `
    @if (sourceLines; as lines) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Source Code</h3>
        </div>
        <div class="px-6 py-4">
          <pre class="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm font-mono border max-h-96 overflow-y-auto"><code>@for (line of lines; track $index) {<div>{{ line.content }}</div>}</code></pre>
        </div>
      </div>
    } @else {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Source Code</h3>
        </div>
        <div class="px-6 py-4">
          <div class="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>Source content not available</p>
            <p class="text-sm mt-1">
              This source file does not have embedded source content in the source map.
            </p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class SourceCodeViewerComponent {
  @Input() sourceLines!: SourceLine[] | null;
}