import {
  Component,
  ElementRef,
  Input,
  computed,
  signal,
  viewChild,
} from '@angular/core';
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
import { MappingImpact } from '../../models/bundle.models';

interface GeneratedLocation {
  chunkId: string;
  line: number;
  column: number;
  sizeImpact: number;
  highlightedCode: string;
}

interface HoveredMappingInfo {
  originalLine: number;
  originalColumn: number;
  generatedLocations: GeneratedLocation[];
}

@Component({
  selector: 'section[appSourceSemanticAnalysis]',
  imports: [],
  template: `
    @if (analysisResult(); as analysis) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Symbols</h3>
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
            @if (analysis.methods.length > 0) {
              <button
                (click)="setActiveFilter('method')"
                [class]="getFilterButtonClass('method')"
              >
                Methods ({{ analysis.methods.length }})
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
        <div class="divide-y divide-gray-200 max-h-144 overflow-y-auto">
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
                      <div class="flex items-center space-x-4">
                        <div class="text-xs text-gray-500">
                          Lines {{ fragment.startLine }}-{{ fragment.endLine }}
                        </div>
                        <div
                          class="text-xs text-gray-500 flex items-center space-x-1"
                        >
                          <span>Bundle impact:</span>
                          <span
                            class="inline-block w-3 h-3 bg-green-50 border-l-2 border-green-200"
                            title="Low impact (<10 bytes)"
                          ></span>
                          <span
                            class="inline-block w-3 h-3 bg-green-100 border-l-2 border-green-300"
                            title="Small impact (10-50 bytes)"
                          ></span>
                          <span
                            class="inline-block w-3 h-3 bg-yellow-50 border-l-2 border-yellow-300"
                            title="Medium impact (50-100 bytes)"
                          ></span>
                          <span
                            class="inline-block w-3 h-3 bg-orange-50 border-l-2 border-orange-400"
                            title="Large impact (100-200 bytes)"
                          ></span>
                          <span
                            class="inline-block w-3 h-3 bg-red-100 border-l-2 border-red-500"
                            title="Very large impact (200+ bytes)"
                          ></span>
                        </div>
                      </div>
                    </div>
                    <div class="relative">
                      <pre
                        class="text-sm text-gray-800 bg-white p-4 overflow-y-auto"
                        (mousemove)="onCodeMouseMove($event, fragment)"
                        (mouseleave)="hideTooltip()"
                      ><code [innerHTML]="getFragmentCode(fragment)"></code></pre>

                      <!-- Hover Tooltip -->
                      <div
                        class="fixed bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 max-w-lg"
                        popover="manual"
                        [style.left.px]="tooltipPosition().x"
                        [style.top.px]="tooltipPosition().y"
                        #hoverTooltip
                      >
                        @if (hoveredMapping()) {
                          <div class="font-semibold mb-2">
                            Generated Code for Line
                            {{ hoveredMapping()!.originalLine }}:{{
                              hoveredMapping()!.originalColumn
                            }}
                          </div>
                          @for (
                            generated of hoveredMapping()!.generatedLocations;
                            track generated.chunkId +
                              ':' +
                              generated.line +
                              ':' +
                              generated.column
                          ) {
                            <div
                              class="mb-2 border-b border-gray-600 pb-2 last:border-b-0 last:pb-0"
                            >
                              <div class="text-gray-300 text-xs mb-1">
                                {{ generated.chunkId }}:{{ generated.line }}:{{ generated.column }} ({{
                                  formatSize(generated.sizeImpact)
                                }})
                              </div>
                              <pre
                                class="bg-gray-800 p-2 rounded text-xs max-w-lg whitespace-pre-wrap"
                              ><code [innerHTML]="generated.highlightedCode"></code></pre>
                            </div>
                          }
                        }
                      </div>
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
  readonly hoveredMapping = signal<HoveredMappingInfo | null>(null);
  readonly tooltipPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  private hoverTooltip = viewChild('hoverTooltip', { read: ElementRef });

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

    // Get mapping impacts to calculate bundle contribution per line
    const mappingImpacts = this.bundleService.getMappingImpacts(this.path);
    const lineBundleBytes =
      this.calculateLineBundleContribution(mappingImpacts);

    // Add line numbers with bundle impact background colors
    const lines = highlighted.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNumber = startLineNumber + index;
      const paddedNumber = lineNumber.toString().padStart(3, ' ');
      const bundleBytes = lineBundleBytes.get(lineNumber) || 0;
      const backgroundClass = this.getLineBackgroundClass(bundleBytes);

      const tooltip =
        bundleBytes > 0
          ? `title="Line ${lineNumber}: ${bundleBytes} bytes in bundle"`
          : '';
      return `<span class="select-none mr-2 inline-block w-16 text-right px-1 py-0.5 rounded-r ${backgroundClass}" ${tooltip}>${paddedNumber}</span>${line}`;
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

  /**
   * Calculate bundle size contribution per line from mapping impacts
   */
  private calculateLineBundleContribution(
    mappingImpacts: MappingImpact[],
  ): Map<number, number> {
    const lineBundleBytes = new Map<number, number>();

    for (const impact of mappingImpacts) {
      const line = impact.originalLine;
      const currentBytes = lineBundleBytes.get(line) || 0;
      lineBundleBytes.set(line, currentBytes + impact.sizeImpact);
    }

    return lineBundleBytes;
  }

  /**
   * Get background color class based on bundle size contribution
   */
  private getLineBackgroundClass(bundleBytes: number): string {
    if (bundleBytes === 0) {
      return 'text-gray-400'; // No bundle contribution - default gray
    }

    // Color intensity based on bundle contribution - more subtle colors for better readability
    if (bundleBytes < 10) {
      return 'text-gray-700 bg-green-50 border-l-2 border-green-200'; // Very small contribution
    } else if (bundleBytes < 50) {
      return 'text-gray-800 bg-green-100 border-l-2 border-green-300'; // Small contribution
    } else if (bundleBytes < 100) {
      return 'text-gray-800 bg-yellow-50 border-l-2 border-yellow-300'; // Medium contribution
    } else if (bundleBytes < 200) {
      return 'text-gray-900 bg-orange-50 border-l-2 border-orange-400'; // Large contribution
    } else {
      return 'text-gray-900 bg-red-100 border-l-2 border-red-500 font-semibold'; // Very large contribution
    }
  }

  /**
   * Handle mouse move events on code snippets to show generated code mappings
   */
  onCodeMouseMove(event: MouseEvent, fragment: SourceFragment): void {
    const target = event.target as HTMLElement;

    // Check if we're hovering over the actual code (not line numbers)
    if (
      !target ||
      !(
        target.tagName.toLowerCase() === 'span' &&
        target.classList.contains('token')
      )
    ) {
      this.hoverTooltip()?.nativeElement.hidePopover();
      return;
    }

    // target is a token span, we can use it to determine the line & offset.
    let column = 0;
    let line = 0;
    let el = target.previousSibling;
    while (el !== null) {
      if (el instanceof HTMLElement && el.classList.contains('select-none')) {
        // Line marker!
        line = parseInt(el.textContent?.trim() || '0', 10);
        break;
      }

      // Before we reach the first line marker, we count characters.
      column += el.textContent?.length || 0;
      el = el.previousSibling;
    }

    // Get generated mappings for this source position
    const mappingInfo = this.getGeneratedMappingInfo(line, column);

    const rect = target.getBoundingClientRect();

    if (mappingInfo && mappingInfo.generatedLocations.length > 0) {
      this.hoveredMapping.set(mappingInfo);
      this.tooltipPosition.set({
        x: Math.min(rect.left), // Keep tooltip within bounds
        y: Math.max(rect.bottom),
      });
      this.hoverTooltip()?.nativeElement.showPopover();
    } else {
      this.hoverTooltip()?.nativeElement.hidePopover();
      this.hoveredMapping.set(null);
    }
  }

  /**
   * Hide the tooltip when mouse leaves the code area
   */
  hideTooltip(): void {
    this.hoveredMapping.set(null);
  }

  /**
   * Get generated code locations for a source position
   */
  private getGeneratedMappingInfo(
    originalLine: number,
    originalColumn: number,
  ): HoveredMappingInfo | null {
    const generatedLocations = this.bundleService.getGeneratedLocations(
      this.path,
      originalLine,
      originalColumn,
    );

    if (generatedLocations.length === 0) {
      return null;
    }

    const mappedLocations: GeneratedLocation[] = generatedLocations.map(
      (loc) => ({
        chunkId: loc.chunkId,
        line: loc.generatedLine,
        column: loc.generatedColumn,
        sizeImpact: loc.sizeImpact,
        highlightedCode: this.applyBasicHighlighting(loc.snippet),
      }),
    );

    return {
      originalLine,
      originalColumn,
      generatedLocations: mappedLocations,
    };
  }

  /**
   * Apply basic syntax highlighting to generated code snippet
   */
  private applyBasicHighlighting(code: string): string {
    // Basic escaping for HTML
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply basic JavaScript syntax highlighting
    try {
      const grammar = Prism.languages['javascript'];
      highlighted = Prism.highlight(highlighted, grammar, 'javascript');
    } catch (error) {
      // If highlighting fails, return escaped code
    }

    return highlighted;
  }
}
