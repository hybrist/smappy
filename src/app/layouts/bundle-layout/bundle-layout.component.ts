import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { FormatSizePipe } from '../../pipes/format-size.pipe';
import { currentBundle } from '../../resolvers/bundle';
import { BundleService } from '../../services/bundle.service';

@Component({
  selector: 'app-bundle-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormatSizePipe],
  template: `
    @if (bundle().hasValue()) {
      @let bundle = this.bundle().value()!;

      <div class="min-h-screen bg-gray-50">
        <nav class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between h-16">
              <div class="flex items-center space-x-4">
                <h1 class="text-xl font-semibold text-gray-900">
                  <a routerLink="/home" class="hover:text-blue-600">Smappy</a>
                </h1>
                <span class="text-sm text-gray-500">
                  {{ bundle.totalSize | formatSize }} total
                </span>
              </div>

              <div class="flex items-center space-x-6">
                @let bundleId = bundle.bundleId;
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
          <router-outlet />
        </main>
      </div>
    } @else if (bundle().error()) {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Failed to load bundle</p>
        <a routerLink="/home" class="text-blue-600 hover:text-blue-800">
          Upload a bundle to get started
        </a>
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Loading bundle...</p>
        <a routerLink="/home" class="text-blue-600 hover:text-blue-800">
          Upload a bundle to get started
        </a>
      </div>
    }
  `,
  styles: [],
})
export class BundleLayoutComponent {
  private readonly router = inject(Router);
  private readonly bundleService = inject(BundleService);

  protected readonly bundle = currentBundle();

  async reset(): Promise<void> {
    await this.bundleService.reset();
    this.router.navigate(['/home']);
  }
}
