import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormatSizePipe } from '../../pipes/format-size.pipe';
import { currentBundle } from '../../resolvers/bundle';

@Component({
  selector: 'section[appSourceDetailHeader]',
  imports: [RouterLink, FormatSizePipe],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          @let bundleId = bundle().value()?.bundleId;
          <a
            [routerLink]="['/bundle', bundleId, 'sources']"
            class="hover:text-blue-600"
            >Sources</a
          >
          <span>/</span>
          <span class="text-gray-900">{{ baseName() }}</span>
        </nav>
        <h2 class="text-2xl font-bold text-gray-900">
          {{ baseName() }}
        </h2>
        <p class="text-sm text-gray-500 mt-1">{{ path() }}</p>
      </div>
      <div class="text-right">
        <div class="text-2xl font-semibold text-gray-900">
          {{ size() | formatSize }}
        </div>
        <div class="text-sm text-gray-500">
          <strong class="text-gray-600">{{ percentage() }}%</strong> of bundle
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class SourceDetailHeaderComponent {
  readonly path = input.required<string>();
  readonly size = input.required<number>();

  protected readonly bundle = currentBundle();

  percentage = computed(() => {
    return ((this.size() / this.bundle().value()!.totalSize) * 100).toFixed(1);
  });
  baseName = computed(() => {
    return this.path().split('/').pop() || this.path();
  });
}
