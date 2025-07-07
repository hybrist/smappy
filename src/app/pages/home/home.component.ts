import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BundleService } from '../../services/bundle.service';
import { StorageService } from '../../services/storage.service';
import { BundleConfig } from '../../models/bundle.models';

@Component({
  selector: 'app-home',
  imports: [],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Smappy</h1>
        <p class="text-gray-600 mb-6">
          Analyze your JavaScript bundles and source maps
        </p>

        @if (storedAnalyses().length > 0) {
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <svg
                  class="w-5 h-5 text-green-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                <p class="text-sm font-medium text-green-800">
                  {{ storedAnalyses().length }} Stored Analysis{{
                    storedAnalyses().length > 1 ? 'es' : ''
                  }}
                </p>
              </div>
              <button
                (click)="startNewAnalysis()"
                class="text-xs bg-white text-green-700 border border-green-600 px-2 py-1 rounded hover:bg-green-50"
              >
                Clear All
              </button>
            </div>

            <div class="space-y-2 max-h-48 overflow-y-auto">
              @for (analysis of storedAnalyses(); track analysis.filename) {
                <div
                  class="bg-white border border-green-200 rounded p-3 hover:bg-green-25 cursor-pointer"
                  (click)="loadBundleAnalysis(analysis.filename)"
                >
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <p class="text-sm font-medium text-gray-900">
                        @if (analysis.totalSize) {
                          {{ formatSize(analysis.totalSize) }}
                          @if (analysis.chunkCount) {
                            • {{ analysis.chunkCount }} chunk{{
                              analysis.chunkCount > 1 ? 's' : ''
                            }}
                          }
                        } @else {
                          Bundle Analysis
                        }
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ analysis.displayDateTime }} •
                        {{ analysis.displayAge }}
                      </p>
                    </div>
                    <button
                      class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex-shrink-0 ml-2"
                      (click)="
                        loadBundleAnalysis(analysis.filename);
                        $event.stopPropagation()
                      "
                    >
                      Open
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Files
            </label>
            <input
              type="file"
              multiple
              accept=".js,.css,.map,.sourcemap"
              (change)="onFilesSelected($event)"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          @if (chunks.length > 0) {
            <div class="bg-blue-50 p-3 rounded">
              <p class="text-sm text-blue-800">
                {{ chunks.length }} chunk{{ chunks.length > 1 ? 's' : '' }}
                selected
                @if (sourceMaps.length > 0) {
                  <br />{{ sourceMaps.length }} source map{{
                    sourceMaps.length > 1 ? 's' : ''
                  }}
                  selected
                }
              </p>
            </div>
          }

          <button
            (click)="analyzeBundle()"
            [disabled]="chunks.length === 0 || loading()"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            @if (loading()) {
              Analyzing...
            } @else {
              Analyze Bundle
            }
          </button>

          @if (errorMessage()) {
            <div
              class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
            >
              {{ errorMessage() }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly bundleService = inject(BundleService);
  private readonly storageService = inject(StorageService);

  readonly loading = this.bundleService.loading;
  readonly errorMessage = this.bundleService.errorMessage;
  readonly bundle = this.bundleService.bundle;

  chunks: File[] = [];
  sourceMaps: File[] = [];
  bundleAge: string = '';
  storedAnalyses = signal<
    {
      filename: string;
      timestamp: number;
      age: number;
      displayAge: string;
      displayDateTime: string;
      totalSize?: number;
      chunkCount?: number;
    }[]
  >([]);

  constructor() {
    this.loadStoredAnalyses();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    for (const file of input.files || []) {
      if (file.name.endsWith('.map') || file.name.endsWith('.sourcemap')) {
        this.sourceMaps.push(file);
      } else {
        this.chunks.push(file);
      }
    }
  }

  async analyzeBundle(): Promise<void> {
    if (this.chunks.length === 0) return;

    const config: BundleConfig = {
      chunks: this.chunks,
      sourceMaps: this.sourceMaps.length > 0 ? this.sourceMaps : undefined,
    };

    await this.bundleService.loadBundle(config);

    if (this.bundleService.bundle()) {
      this.router.navigate(['/bundle']);
    }
  }

  viewExistingBundle(): void {
    this.router.navigate(['/bundle']);
  }

  async startNewAnalysis(): Promise<void> {
    await this.bundleService.reset();
    this.chunks = [];
    this.sourceMaps = [];
    this.bundleAge = '';
    await this.loadStoredAnalyses();
  }

  private async loadStoredAnalyses(): Promise<void> {
    try {
      const analyses = await this.storageService.getAllBundleAnalyses();

      // Load details for each analysis
      const analysesWithDetails = await Promise.all(
        analyses.map(async (analysis) => {
          try {
            const bundleData =
              await this.storageService.loadBundleAnalysisByFilename(
                analysis.filename,
              );
            return {
              ...analysis,
              displayAge: this.formatAge(analysis.age),
              displayDateTime: this.formatTimestamp(analysis.timestamp),
              totalSize: bundleData?.totalSize,
              chunkCount: bundleData?.chunks.length,
            };
          } catch (error) {
            return {
              ...analysis,
              displayAge: this.formatAge(analysis.age),
              displayDateTime: this.formatTimestamp(analysis.timestamp),
            };
          }
        }),
      );

      analysesWithDetails.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
      this.storedAnalyses.set(analysesWithDetails);
    } catch (error) {
      console.warn('Failed to load stored analyses:', error);
      this.storedAnalyses.set([]);
    }
  }

  async loadBundleAnalysis(filename: string): Promise<void> {
    try {
      await this.bundleService.loadStoredBundleAnalysis(filename);
      if (this.bundleService.bundle()) {
        this.router.navigate(['/bundle']);
      }
    } catch (error) {
      console.warn('Failed to load bundle analysis:', error);
    }
  }

  private formatAge(ageMs: number): string {
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
