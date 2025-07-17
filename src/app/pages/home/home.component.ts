import { DatePipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormatAgePipe } from '../../pipes';
import { BundleService } from '../../services/bundle.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-home',
  imports: [DatePipe, FormatAgePipe, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Smappy</h1>
        <p class="text-gray-600 mb-6">
          Analyze your JavaScript bundles and source maps
        </p>

        @if (bundles.value().length > 0) {
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
                <p class="text-sm font-medium text-green-800" i18n>
                  @let count = bundles.value().length;
                  {count, plural,
                    one {{{count}} Stored Bundle}
                    other {{{count}} Stored Bundles}
                  }
                </p>
              </div>
              <button
                (click)="clearAllBundles()"
                class="text-xs bg-white text-green-700 border border-green-600 px-2 py-1 rounded hover:bg-green-50"
              >
                Clear All
              </button>
            </div>

            <div class="space-y-2 max-h-48 overflow-y-auto">
              @for (bundle of bundles.value(); track bundle.id) {
                <a
                  class="block bg-white border border-green-200 rounded p-3 hover:bg-green-25 cursor-pointer"
                  [routerLink]="['/bundle', bundle.id]"
                >
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="text-sm font-medium text-gray-900">
                        {{ bundle.name }}
                        @if (bundle.files.length; as fileCount) {
                          •
                          <span i18n>{fileCount, plural,
                            one {{{ fileCount }} file}
                            other {{{ fileCount }} files}
                          }</span>
                        }
                      </div>
                      <div class="text-xs text-gray-600">
                        {{ bundle.importedAt | date: 'short' }} •
                        {{ currentTime() - bundle.importedAt | formatAge }}
                      </div>
                    </div>
                    <span
                      class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex-shrink-0 ml-2"
                    >
                      Open
                    </span>
                  </div>
                </a>
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

          <button
            (click)="analyzeBundle()"
            [disabled]="inputFiles().length === 0 || loading()"
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

  inputFiles = signal<File[]>([]);

  bundles = resource({
    loader: () => this.storageService.listAllBundles(),
    defaultValue: [],
  });

  currentTime = signal(Date.now());

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inputFiles.set([...(input.files || [])]);
  }

  async analyzeBundle(): Promise<void> {
    if (this.inputFiles().length === 0) return;

    const bundleId = await this.bundleService.loadBundle(this.inputFiles());

    if (bundleId) {
      this.router.navigate(['/bundle', bundleId]);
    }
  }

  async clearAllBundles(): Promise<void> {
    await this.storageService.clearAllData();
    this.bundles.reload();
  }
}
