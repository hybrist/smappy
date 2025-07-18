import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  ASTNodeInfo,
  SourceAnalysisResult,
  SourceFragment,
} from '../../models/source-analysis.models';
import {
  GeneratedLocation,
  HoveredMappingInfo,
  TooltipPosition,
} from '../../models/ui.models';
import { currentBundle } from '../../resolvers/bundle';
import { BundleService } from '../../services/bundle.service';
import { SourceAnalysisService } from '../../services/source-analysis.service';
import { BundleSizeUtils } from '../../utils/bundle-size.utils';
import { FragmentIconUtils } from '../../utils/fragment-icon.utils';
import { SyntaxHighlightingUtils } from '../../utils/syntax-highlighting.utils';

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
                      <div class="text-sm">
                        {{ formatSize(fragment.sourceSize) }}
                        →
                        @if (fragment.bundleSize! < fragment.sourceSize) {
                          <span class="text-green-600 font-medium">{{
                            formatSize(fragment.bundleSize || 0)
                          }}</span>
                        } @else {
                          <span class="font-medium">{{
                            formatSize(fragment.bundleSize || 0)
                          }}</span>
                        }
                      </div>
                    } @else {
                      <div class="text-sm text-gray-500">
                        (source) {{ formatSize(fragment.sourceSize) }}
                      </div>
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
                            <span class="text-xs text-gray-400 ml-2">
                              (AST-based range detection)
                            </span>
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
                                {{ generated.chunkId }}:{{ generated.line }}:{{
                                  generated.column
                                }}
                                ({{ formatSize(generated.sizeImpact) }})
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
  path = input.required<string>();

  private readonly sourceAnalysisService = inject(SourceAnalysisService);
  private readonly bundleService = inject(BundleService);
  private readonly activeFilter = signal<string>('all');
  private readonly expandedFragments = signal<Set<string>>(new Set());
  readonly hoveredMapping = signal<HoveredMappingInfo | null>(null);
  readonly tooltipPosition = signal<TooltipPosition>({ x: 0, y: 0 });

  private readonly bundle = currentBundle();

  private hoverTooltip = viewChild('hoverTooltip', { read: ElementRef });

  readonly analysisResult = computed(() => {
    const currentPath = this.path();
    if (!currentPath) return null;
    return this.sourceAnalysisService.analyzeSourceFile(
      this.bundle().value()!,
      currentPath,
    );
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

  getFragmentIconClass(type: string, inBundle: boolean): string {
    return FragmentIconUtils.getIconClass(type as any, inBundle);
  }

  getFragmentIconPath(type: string): string {
    return FragmentIconUtils.getIconPath(type as any);
  }

  getFragmentTypeLabel(type: string): string {
    return FragmentIconUtils.getTypeLabel(type as any);
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
    return BundleSizeUtils.formatSize(bytes);
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
    const sourceContent = this.bundleService.getSourceContent(
      this.bundle().value()!,
      this.path(),
    );
    if (!sourceContent) {
      return '<span class="text-gray-500 italic">Source content not available</span>';
    }

    const lines = sourceContent.split('\n');
    const startIdx = Math.max(0, fragment.startLine - 1);
    const endIdx = Math.min(lines.length, fragment.endLine);

    const fragmentLines = lines.slice(startIdx, endIdx);
    const fragmentCode = fragmentLines.join('\n');

    return this.applySyntaxHighlighting(fragmentCode, fragment.startLine);
  }

  private applySyntaxHighlighting(
    code: string,
    startLineNumber: number,
  ): string {
    const language = SyntaxHighlightingUtils.getLanguageFromPath(this.path());
    const highlighted = SyntaxHighlightingUtils.highlightCode(code, language);

    const mappingImpacts = this.bundleService.getMappingImpacts(
      this.bundle().value()!,
      this.path(),
    );
    const lineBundleBytes =
      BundleSizeUtils.calculateLineBundleContribution(mappingImpacts);

    const lines = highlighted.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNumber = startLineNumber + index;
      const paddedNumber = lineNumber.toString().padStart(3, ' ');
      const bundleBytes = lineBundleBytes.get(lineNumber) || 0;
      const backgroundClass =
        BundleSizeUtils.getLineBackgroundClass(bundleBytes);

      const tooltip =
        bundleBytes > 0
          ? `title="Line ${lineNumber}: ${bundleBytes} bytes in bundle"`
          : '';
      return `<span class="select-none mr-2 inline-block w-16 text-right px-1 py-0.5 rounded-r ${backgroundClass}" ${tooltip}>${paddedNumber}</span>${line}`;
    });

    return numberedLines.join('\n');
  }

  /**
   * Handle mouse move events on code snippets to show generated code mappings
   */
  onCodeMouseMove(event: MouseEvent, _fragment: SourceFragment): void {
    let target = event.target as ChildNode;

    // Check if we're hovering over the actual code (not line numbers)
    if (!target) {
      this.hoverTooltip()?.nativeElement.hidePopover();
      return;
    }

    if (
      target instanceof HTMLElement &&
      target.tagName.toLowerCase() === 'code'
    ) {
      for (const child of target.childNodes) {
        if (
          child.nodeType !== Node.TEXT_NODE ||
          child.textContent?.trim() === ''
        ) {
          continue;
        }
        const range = document.createRange();
        range.selectNode(child);
        const rect = range.getBoundingClientRect();
        range.detach();

        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          target = child; // Use the text node directly
          break;
        }
      }
    }

    const isTokenSpan =
      target instanceof HTMLElement &&
      target.tagName.toLowerCase() === 'span' &&
      target.classList.contains('token');
    const isPlainText =
      target instanceof Text && target.textContent?.trim() !== '';

    if (!isTokenSpan && !isPlainText) {
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

    // Check if we have an AST and can find a node at this position
    const analysisResult = this.analysisResult();
    let mappingInfo: HoveredMappingInfo | null = null;

    if (analysisResult?.astNodeLookup) {
      // Fast lookup using precomputed table
      const astNode = this.findASTNodeAtPositionFast(
        analysisResult.astNodeLookup,
        line,
        column,
      );
      if (astNode) {
        // Get mappings for the entire AST node range
        mappingInfo = this.getGeneratedMappingInfoForRange(
          astNode.startLine,
          astNode.startColumn,
          astNode.endLine,
          astNode.endColumn,
        );
      }
    }

    // Fallback to single point mapping if no AST node found
    if (!mappingInfo) {
      mappingInfo = this.getGeneratedMappingInfo(line, column);
    }

    // Determine anchor position for tooltip.
    const range = document.createRange();
    range.selectNode(target);
    const rect = range.getBoundingClientRect();
    range.detach();

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
      this.bundle().value()!,
      this.path(),
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
        highlightedCode: SyntaxHighlightingUtils.applyBasicHighlighting(
          loc.snippet,
        ),
      }),
    );

    return {
      originalLine,
      originalColumn,
      generatedLocations: mappedLocations,
    };
  }

  /**
   * Find the largest AST node that starts at the given position using fast lookup
   */
  private findASTNodeAtPositionFast(
    astNodeLookup: Map<string, ASTNodeInfo[]>,
    line: number,
    column: number,
  ): ASTNodeInfo | null {
    const key = `${line}:${column}`;
    const nodes = astNodeLookup.get(key);

    // Return the largest node (already sorted by size desc)
    return nodes && nodes.length > 0 ? nodes[0] : null;
  }

  /**
   * Get generated code locations for a range of source positions (optimized)
   */
  private getGeneratedMappingInfoForRange(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
  ): HoveredMappingInfo | null {
    const allGeneratedLocations: GeneratedLocation[] = [];
    const seenLocations = new Set<string>(); // For faster duplicate detection

    // Optimize: limit to 3 positions max to keep hover responsive
    const positions: Array<{ line: number; column: number }> = [];

    if (startLine === endLine) {
      // Single line - just check start position
      positions.push({ line: startLine, column: startColumn });
    } else {
      // Multi-line - check start, middle (if exists), and a position on end line
      positions.push({ line: startLine, column: startColumn });
      if (endLine - startLine > 1) {
        positions.push({ line: startLine + 1, column: 0 }); // Middle line
      }
      positions.push({ line: endLine, column: Math.min(20, endColumn) }); // End line
    }

    for (const pos of positions) {
      const generatedLocations = this.bundleService.getGeneratedLocations(
        this.bundle().value()!,
        this.path(),
        pos.line,
        pos.column,
      );

      for (const loc of generatedLocations) {
        const locationKey = `${loc.chunkId}:${loc.generatedLine}:${loc.generatedColumn}`;

        if (!seenLocations.has(locationKey)) {
          seenLocations.add(locationKey);
          allGeneratedLocations.push({
            chunkId: loc.chunkId,
            line: loc.generatedLine,
            column: loc.generatedColumn,
            sizeImpact: loc.sizeImpact,
            highlightedCode: SyntaxHighlightingUtils.applyBasicHighlighting(
              loc.snippet,
            ),
          });
        }
      }
    }

    if (allGeneratedLocations.length === 0) {
      return null;
    }

    // Sort by size impact (largest first) and limit results
    allGeneratedLocations.sort((a, b) => b.sizeImpact - a.sizeImpact);
    const limitedLocations = allGeneratedLocations.slice(0, 3); // Limit to top 3 for performance

    return {
      originalLine: startLine,
      originalColumn: startColumn,
      generatedLocations: limitedLocations,
    };
  }
}
