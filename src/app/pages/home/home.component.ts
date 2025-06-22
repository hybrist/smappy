import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BundleService } from '../../services/bundle.service';
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

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Bundle Files (JS)
            </label>
            <input
              type="file"
              multiple
              accept=".js"
              (change)="onChunksSelected($event)"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Source Maps (optional)
            </label>
            <input
              type="file"
              multiple
              accept=".map"
              (change)="onSourceMapsSelected($event)"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
          </div>

          @if (chunks.length > 0) {
            <div class="bg-blue-50 p-3 rounded">
              <p class="text-sm text-blue-800">
                {{ chunks.length }} chunk{{
                  chunks.length > 1 ? 's' : ''
                }}
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

  readonly loading = this.bundleService.loading;
  readonly errorMessage = this.bundleService.errorMessage;

  chunks: File[] = [];
  sourceMaps: File[] = [];

  onChunksSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.chunks = Array.from(input.files);
    }
  }

  onSourceMapsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.sourceMaps = Array.from(input.files);
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
}
