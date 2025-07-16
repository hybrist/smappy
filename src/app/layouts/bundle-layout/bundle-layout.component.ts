import { Component, inject, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
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
              @if (bundle() && bundleId) {
                <a
                  [routerLink]="['/bundle', bundleId]"
                  routerLinkActive="text-blue-600 border-blue-600"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Overview
                </a>
                <a
                  [routerLink]="['/bundle', bundleId, 'chunks']"
                  routerLinkActive="text-blue-600 border-blue-600"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Chunks
                </a>
                <a
                  [routerLink]="['/bundle', bundleId, 'sources']"
                  routerLinkActive="text-blue-600 border-blue-600"
                  class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium border-b-2 border-transparent"
                >
                  Sources
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
export class BundleLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bundleService = inject(BundleService);

  readonly bundle = this.bundleService.bundle;
  bundleId: string | null = null;
  isLoading = false;

  async ngOnInit() {
    this.route.params.subscribe(async (params) => {
      const bundleId = params['bundleId'];
      if (bundleId) {
        this.bundleId = bundleId;
        await this.loadBundleFromId(bundleId);
      }
    });
  }

  private async loadBundleFromId(bundleId: string): Promise<void> {
    try {
      this.isLoading = true;
      await this.bundleService.loadStoredBundle(bundleId);

      if (!this.bundleService.bundle()) {
        // Bundle not found, redirect to home
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.warn('Failed to load bundle from URL:', error);
      this.router.navigate(['/home']);
    } finally {
      this.isLoading = false;
    }
  }

  async reset(): Promise<void> {
    await this.bundleService.reset();
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
