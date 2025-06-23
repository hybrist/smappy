import { Component, Input, computed, signal } from '@angular/core';
import { SourceAnalysisService } from '../../services/source-analysis.service';
import { BundleService } from '../../services/bundle.service';
import { inject } from '@angular/core';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import {
  SourceAnalysisResult,
  SourceFragment,
  FragmentType,
} from '../../models/source-analysis.models';

@Component({
  selector: 'section[appSourceSemanticAnalysis]',
  imports: [],
  template: `
    @if (analysisResult(); as analysis) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Semantic Analysis</h3>
        </div>

        <!-- Fragment Type Filters -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex flex-wrap gap-2">
            <button
              (click)="setActiveFilter('all')"
              [class]="getFilterButtonClass('all')"
            >
              All ({{ analysis.fragments.length }})
            </button>
            @if (analysis.classes.length > 0) {
              <button
                (click)="setActiveFilter('class')"
                [class]="getFilterButtonClass('class')"
              >
                Classes ({{ analysis.classes.length }})
              </button>
            }
            @if (analysis.functions.length > 0) {
              <button
                (click)="setActiveFilter('function')"
                [class]="getFilterButtonClass('function')"
              >
                Functions ({{ analysis.functions.length }})
              </button>
            }
            @if (analysis.variables.length > 0) {
              <button
                (click)="setActiveFilter('variable')"
                [class]="getFilterButtonClass('variable')"
              >
                Variables ({{ analysis.variables.length }})
              </button>
            }
            @if (analysis.types.length > 0) {
              <button
                (click)="setActiveFilter('type')"
                [class]="getFilterButtonClass('type')"
              >
                Types ({{ analysis.types.length }})
              </button>
            }
            @if (analysis.imports.length > 0) {
              <button
                (click)="setActiveFilter('import')"
                [class]="getFilterButtonClass('import')"
              >
                Imports ({{ analysis.imports.length }})
              </button>
            }
            @if (analysis.exports.length > 0) {
              <button
                (click)="setActiveFilter('export')"
                [class]="getFilterButtonClass('export')"
              >
                Exports ({{ analysis.exports.length }})
              </button>
            }
            @if (analysis.unusedFragments.length > 0) {
              <button
                (click)="setActiveFilter('unused')"
                [class]="getFilterButtonClass('unused')"
              >
                Unused ({{ analysis.unusedFragments.length }})
              </button>
            }
          </div>
        </div>

        <!-- Fragment List -->
        <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          @for (fragment of filteredFragments(); track fragment.id) {
            <div>
              <div
                class="px-6 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                (click)="toggleFragment(fragment.id)"
              >
                <div class="flex items-center min-w-0 flex-1">
                  <div class="flex items-center mr-3">
                    <button
                      class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-transform"
                      [class.rotate-90]="isFragmentExpanded(fragment.id)"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </button>
                    <div
                      class="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ml-2"
                      [class]="
                        getFragmentIconClass(
                          fragment.type,
                          fragment.isIncludedInBundle
                        )
                      "
                    >
                      <svg
                        class="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          [attr.d]="getFragmentIconPath(fragment.type)"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center">
                      <div
                        class="text-sm font-medium truncate"
                        [class]="
                          fragment.isIncludedInBundle
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        "
                      >
                        {{ fragment.name }}
                      </div>
                      @if (fragment.signature) {
                        <div class="text-xs text-gray-500 ml-2 font-mono">
                          {{ fragment.signature }}
                        </div>
                      }
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ getFragmentTypeLabel(fragment.type) }} ·
                      @if (fragment.startLine === fragment.endLine) {
                        Line {{ fragment.startLine }}
                      } @else {
                        Lines {{ fragment.startLine }}-{{ fragment.endLine }}
                      }
                    </div>
                  </div>
                </div>
                <div class="text-right ml-4">
                  <div class="flex items-center space-x-3">
                    @if (fragment.isIncludedInBundle) {
                      <div class="text-sm font-medium text-green-600">
                        {{ formatSize(fragment.bundleSize || 0) }}
                      </div>
                      <div
                        class="w-2 h-2 bg-green-500 rounded-full"
                        title="Included in bundle"
                      ></div>
                    } @else {
                      <div class="text-sm font-medium text-gray-400">
                        (source) {{ formatSize(fragment.sourceSize) }}
                      </div>
                      <div
                        class="w-2 h-2 bg-gray-300 rounded-full"
                        title="Not in bundle"
                      ></div>
                    }
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ getFragmentSizePercentage(fragment, analysis) }}%
                  </div>
                </div>
              </div>

              <!-- Code Snippet -->
              @if (isFragmentExpanded(fragment.id)) {
                <div class="px-6 pb-4 bg-gray-50">
                  <div
                    class="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
                    >
                      <div class="text-sm font-medium text-gray-700">
                        {{ fragment.name }}
                        <span class="text-gray-500">
                          ({{ getFragmentTypeLabel(fragment.type) }})
                        </span>
                      </div>
                      <div class="text-xs text-gray-500">
                        Lines {{ fragment.startLine }}-{{ fragment.endLine }}
                      </div>
                    </div>
                    <div class="relative">
                      <pre
                        class="text-sm text-gray-800 bg-white p-4 overflow-x-auto max-h-80 overflow-y-auto"
                      ><code [innerHTML]="getFragmentCode(fragment)"></code></pre>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Semantic Analysis</h3>
        </div>
        <div class="px-6 py-4 text-center text-gray-500">
          <svg
            class="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Semantic analysis not available</p>
          <p class="text-sm mt-1">
            Unable to parse semantic structure from source content.
          </p>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .rotate-90 {
        transform: rotate(90deg);
      }

      .transition-transform {
        transition: transform 0.2s ease-in-out;
      }

      pre code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        line-height: 1.4;
      }
    `,
  ],
})
export class SourceSemanticAnalysisComponent {
  @Input() path!: string;

  private readonly sourceAnalysisService = inject(SourceAnalysisService);
  private readonly bundleService = inject(BundleService);
  private readonly activeFilter = signal<string>('all');
  private readonly expandedFragments = signal<Set<string>>(new Set());

  readonly analysisResult = computed(() => {
    if (!this.path) return null;
    return this.sourceAnalysisService.analyzeSourceFile(this.path);
  });

  readonly filteredFragments = computed(() => {
    const analysis = this.analysisResult();
    if (!analysis) return [];

    const filter = this.activeFilter();
    switch (filter) {
      case 'all':
        return analysis.fragments;
      case 'class':
        return analysis.classes;
      case 'function':
        return analysis.functions;
      case 'variable':
        return analysis.variables;
      case 'type':
        return analysis.types;
      case 'import':
        return analysis.imports;
      case 'export':
        return analysis.exports;
      case 'unused':
        return analysis.unusedFragments;
      default:
        return analysis.fragments.filter((f) => f.type === filter);
    }
  });

  setActiveFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  getFilterButtonClass(filter: string): string {
    const baseClass = 'px-3 py-1 text-sm rounded-md transition-colors';
    const activeClass = 'bg-blue-100 text-blue-700 border border-blue-200';
    const inactiveClass =
      'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200';

    return `${baseClass} ${this.activeFilter() === filter ? activeClass : inactiveClass}`;
  }

  getFragmentIconClass(type: FragmentType, inBundle: boolean): string {
    if (!inBundle) {
      return 'bg-gray-100 text-gray-600';
    }

    const iconClasses = {
      class: 'bg-purple-100 text-purple-600',
      function: 'bg-blue-100 text-blue-600',
      method: 'bg-blue-100 text-blue-600',
      variable: 'bg-green-100 text-green-600',
      import: 'bg-yellow-100 text-yellow-600',
      export: 'bg-orange-100 text-orange-600',
      interface: 'bg-indigo-100 text-indigo-600',
      type: 'bg-indigo-100 text-indigo-600',
      enum: 'bg-pink-100 text-pink-600',
      namespace: 'bg-teal-100 text-teal-600',
      unknown: 'bg-teal-100 text-teal-600',
    };
    return iconClasses[type] || iconClasses.unknown;
  }

  getFragmentIconPath(type: FragmentType): string {
    const iconPaths = {
      class:
        'M7 8a3 3 0 000 6h6a3 3 0 000-6H7zM4.5 12a4.5 4.5 0 019 0 4.5 4.5 0 01-9 0z',
      function: 'M4 6h16M4 12h16M4 18h16',
      method: 'M4 6h16M4 12h16M4 18h16',
      variable: 'M5 12h14M12 5l7 7-7 7',
      import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      export: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l-4 4m4-4H7',
      interface:
        'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      type: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      enum: 'M4 6h16M4 10h16M4 14h16M4 18h16',
      namespace: 'M19 11H5m14-4H5m14 8H5',
      unknown:
        'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return iconPaths[type] || iconPaths.unknown;
  }

  getFragmentTypeLabel(type: FragmentType): string {
    const labels = {
      class: 'Class',
      function: 'Function',
      method: 'Method',
      variable: 'Variable',
      import: 'Import',
      export: 'Export',
      interface: 'Interface',
      type: 'Type Alias',
      enum: 'Enum',
      namespace: 'Namespace',
      unknown: 'Unknown',
    };
    return labels[type] || 'Unknown';
  }

  getFragmentSizePercentage(
    fragment: SourceFragment,
    analysis: SourceAnalysisResult,
  ): string {
    const totalSize = analysis.totalBundleSize || analysis.totalSourceSize;
    const fragmentSize = fragment.bundleSize || 0;
    if (totalSize === 0) return '0';
    return ((fragmentSize / totalSize) * 100).toFixed(1);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  toggleFragment(fragmentId: string): void {
    const expanded = this.expandedFragments();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(fragmentId)) {
      newExpanded.delete(fragmentId);
    } else {
      newExpanded.add(fragmentId);
    }

    this.expandedFragments.set(newExpanded);
  }

  isFragmentExpanded(fragmentId: string): boolean {
    return this.expandedFragments().has(fragmentId);
  }

  getFragmentCode(fragment: SourceFragment): string {
    const sourceContent = this.bundleService.getSourceContent(this.path);
    if (!sourceContent) {
      return '<span class="text-gray-500 italic">Source content not available</span>';
    }

    const lines = sourceContent.split('\n');
    const startIdx = Math.max(0, fragment.startLine - 1);
    const endIdx = Math.min(lines.length, fragment.endLine);

    const fragmentLines = lines.slice(startIdx, endIdx);
    const fragmentCode = fragmentLines.join('\n');

    // Use Prism.js for syntax highlighting
    return this.applySyntaxHighlighting(fragmentCode, fragment.startLine);
  }

  private applySyntaxHighlighting(
    code: string,
    startLineNumber: number,
  ): string {
    // Determine language based on file extension
    const language = this.getLanguageFromPath(this.path);

    // Use Prism.js to highlight the code
    let highlighted: string;
    try {
      const grammar =
        Prism.languages[language] || Prism.languages['javascript'];
      highlighted = Prism.highlight(code, grammar, language);
    } catch (error) {
      // Fallback to escaped HTML if highlighting fails
      highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // Add line numbers
    const lines = highlighted.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNumber = startLineNumber + index;
      const paddedNumber = lineNumber.toString().padStart(3, ' ');

      return `<span class="text-gray-400 select-none mr-4 inline-block w-8 text-right">${paddedNumber}</span>${line}`;
    });

    return numberedLines.join('\n');
  }

  private getLanguageFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'css':
      case 'scss':
      case 'sass':
        return 'css';
      case 'json':
        return 'json';
      case 'html':
      case 'htm':
        return 'html';
      default:
        return 'javascript'; // Default fallback
    }
  }
}
