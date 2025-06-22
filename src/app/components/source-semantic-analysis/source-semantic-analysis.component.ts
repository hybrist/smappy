import { Component, Input, computed, signal } from '@angular/core';
import { SourceAnalysisService } from '../../services/source-analysis.service';
import { inject } from '@angular/core';
import { SourceAnalysisResult, SourceFragment, FragmentType } from '../../models/source-analysis.models';

@Component({
  selector: 'section[appSourceSemanticAnalysis]',
  imports: [],
  template: `
    @if (analysisResult(); as analysis) {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Semantic Analysis</h3>
        </div>
        
        <!-- Summary Stats -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-semibold text-gray-900">{{ analysis.totalFragments }}</div>
              <div class="text-sm text-gray-500">Total Fragments</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-semibold text-green-600">{{ analysis.includedFragments }}</div>
              <div class="text-sm text-gray-500">In Bundle</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-semibold text-red-600">{{ analysis.unusedFragments.length }}</div>
              <div class="text-sm text-gray-500">Unused</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-semibold text-blue-600">{{ getInclusionPercentage(analysis) }}%</div>
              <div class="text-sm text-gray-500">Inclusion Rate</div>
            </div>
          </div>
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
            <div class="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
              <div class="flex items-center min-w-0 flex-1">
                <div class="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center mr-3"
                     [class]="getFragmentIconClass(fragment.type)">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path [attr.d]="getFragmentIconPath(fragment.type)"></path>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center">
                    <div class="text-sm font-medium text-gray-900 truncate">
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
                    Lines {{ fragment.startLine }}-{{ fragment.endLine }}
                    @if (fragment.accessibility) {
                      · {{ fragment.accessibility }}
                    }
                    @if (fragment.isStatic) {
                      · static
                    }
                    @if (fragment.isAsync) {
                      · async
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
                    <div class="w-2 h-2 bg-green-500 rounded-full" title="Included in bundle"></div>
                  } @else {
                    <div class="text-sm font-medium text-gray-400">
                      {{ formatSize(fragment.sourceSize) }}
                    </div>
                    <div class="w-2 h-2 bg-gray-300 rounded-full" title="Not in bundle"></div>
                  }
                </div>
                <div class="text-xs text-gray-500">
                  {{ getFragmentSizePercentage(fragment, analysis) }}%
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Top Contributors -->
        @if (topFragments().length > 0) {
          <div class="px-6 py-4 border-t border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">Top Contributors to Bundle Size</h4>
            <div class="space-y-2">
              @for (fragment of topFragments(); track fragment.id; let i = $index) {
                <div class="flex items-center justify-between">
                  <div class="flex items-center min-w-0 flex-1">
                    <div class="text-sm text-gray-600 w-4">{{ i + 1 }}.</div>
                    <div class="text-sm font-medium text-gray-900 truncate ml-2">
                      {{ fragment.name }}
                    </div>
                    <div class="text-xs text-gray-500 ml-2">
                      ({{ getFragmentTypeLabel(fragment.type) }})
                    </div>
                  </div>
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatSize(fragment.bundleSize || 0) }}
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Semantic Analysis</h3>
        </div>
        <div class="px-6 py-4 text-center text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Semantic analysis not available</p>
          <p class="text-sm mt-1">Unable to parse semantic structure from source content.</p>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class SourceSemanticAnalysisComponent {
  @Input() path!: string;

  private readonly sourceAnalysisService = inject(SourceAnalysisService);
  private readonly activeFilter = signal<string>('all');

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
        return analysis.fragments.filter(f => f.type === filter);
    }
  });

  readonly topFragments = computed(() => {
    const analysis = this.analysisResult();
    if (!analysis) return [];
    return this.sourceAnalysisService.getTopFragmentsBySize(analysis, 5);
  });

  setActiveFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  getFilterButtonClass(filter: string): string {
    const baseClass = "px-3 py-1 text-sm rounded-md transition-colors";
    const activeClass = "bg-blue-100 text-blue-700 border border-blue-200";
    const inactiveClass = "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200";
    
    return `${baseClass} ${this.activeFilter() === filter ? activeClass : inactiveClass}`;
  }

  getFragmentIconClass(type: FragmentType): string {
    const iconClasses = {
      'class': 'bg-purple-100 text-purple-600',
      'function': 'bg-blue-100 text-blue-600',
      'method': 'bg-blue-100 text-blue-600',
      'variable': 'bg-green-100 text-green-600',
      'import': 'bg-yellow-100 text-yellow-600',
      'export': 'bg-orange-100 text-orange-600',
      'interface': 'bg-indigo-100 text-indigo-600',
      'type': 'bg-indigo-100 text-indigo-600',
      'enum': 'bg-pink-100 text-pink-600',
      'namespace': 'bg-teal-100 text-teal-600',
      'unknown': 'bg-gray-100 text-gray-600',
    };
    return iconClasses[type] || iconClasses.unknown;
  }

  getFragmentIconPath(type: FragmentType): string {
    const iconPaths = {
      'class': 'M7 8a3 3 0 000 6h6a3 3 0 000-6H7zM4.5 12a4.5 4.5 0 019 0 4.5 4.5 0 01-9 0z',
      'function': 'M4 6h16M4 12h16M4 18h16',
      'method': 'M4 6h16M4 12h16M4 18h16',
      'variable': 'M5 12h14M12 5l7 7-7 7',
      'import': 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      'export': 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l-4 4m4-4H7',
      'interface': 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      'type': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'enum': 'M4 6h16M4 10h16M4 14h16M4 18h16',
      'namespace': 'M19 11H5m14-4H5m14 8H5',
      'unknown': 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return iconPaths[type] || iconPaths.unknown;
  }

  getFragmentTypeLabel(type: FragmentType): string {
    const labels = {
      'class': 'Class',
      'function': 'Function',
      'method': 'Method',
      'variable': 'Variable',
      'import': 'Import',
      'export': 'Export',
      'interface': 'Interface',
      'type': 'Type Alias',
      'enum': 'Enum',
      'namespace': 'Namespace',
      'unknown': 'Unknown',
    };
    return labels[type] || 'Unknown';
  }

  getInclusionPercentage(analysis: SourceAnalysisResult): string {
    if (analysis.totalFragments === 0) return '0';
    return ((analysis.includedFragments / analysis.totalFragments) * 100).toFixed(1);
  }

  getFragmentSizePercentage(fragment: SourceFragment, analysis: SourceAnalysisResult): string {
    const totalSize = analysis.totalBundleSize || analysis.totalSourceSize;
    const fragmentSize = fragment.bundleSize || fragment.sourceSize;
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
}