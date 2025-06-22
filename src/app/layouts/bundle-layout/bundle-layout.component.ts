import { Component, inject } from '@angular/core';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';
import { BundleService } from '../../services/bundle.service';

@Component({
  selector: 'app-bundle-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center space-x-4">
              <h1 class="text-xl font-semibold text-gray-900">
                <a routerLink="/home" class="hover:text-blue-600">Smappy</a>
              </h1>
              @if (bundle()) {
                <span class="text-sm text-gray-500">
                  {{ formatSize(bundle()!.totalSize) }} total
                </span>
              }
            </div>

            <div class="flex items-center space-x-6">
              @if (bundle()) {
                <a
                  routerLink="/bundle"
                  routerLinkActive="text-blue-600 border-blue-600"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Overview
                </a>
                <a
                  routerLink="/bundle/chunks"
                  routerLinkActive="text-blue-600 border-blue-600"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Chunks
                </a>
                <a
                  routerLink="/bundle/sources"
                  routerLinkActive="text-blue-600 border-blue-600"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Sources
                </a>
                <a
                  routerLink="/bundle/analysis"
                  routerLinkActive="text-blue-600 border-blue-600"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Analysis
                </a>
              }

              <button
                (click)="reset()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
              >
                New Analysis
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 py-6">
        @if (bundle()) {
          <router-outlet />
        } @else {
          <div class="text-center py-12">
            <p class="text-gray-500 mb-4">No bundle loaded</p>
            <a routerLink="/home" class="text-blue-600 hover:text-blue-800">
              Upload a bundle to get started
            </a>
          </div>
        }
      </main>
    </div>
  `,
  styles: [],
})
export class BundleLayoutComponent {
  private readonly router = inject(Router);
  private readonly bundleService = inject(BundleService);

  readonly bundle = this.bundleService.bundle;

  reset(): void {
    this.bundleService.reset();
    this.router.navigate(['/home']);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
