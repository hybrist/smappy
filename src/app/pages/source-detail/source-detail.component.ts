import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SourceDetailHeaderComponent } from '../../components/source-detail-header/source-detail-header.component';
import { SourceSemanticAnalysisComponent } from '../../components/source-semantic-analysis/source-semantic-analysis.component';
import { currentBundle } from '../../resolvers/bundle';
import { BundleService } from '../../services/bundle.service';
import { getChunksBySource, getSourceContent } from '../../models/bundle.models';

@Component({
  selector: 'app-source-detail',
  imports: [
    RouterLink,
    SourceDetailHeaderComponent,
    SourceSemanticAnalysisComponent,
  ],
  template: `
    @if (sourceInfo(); as info) {
      <div class="space-y-6">
        <section
          appSourceDetailHeader
          [path]="info.path"
          [size]="info.size"
        ></section>
        <section appSourceSemanticAnalysis [path]="info.path"></section>
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Source file not found</p>
        @let bundleId = bundle().value()!.bundleId;
        <a
          [routerLink]="['/bundle', bundleId, 'sources']"
          class="text-blue-600 hover:text-blue-800"
        >
          ← Back to sources
        </a>
      </div>
    }
  `,
})
export class SourceDetailComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly bundle = currentBundle();

  private readonly queryParams = toSignal(this.route.queryParams);
  private readonly sourcePath = computed<string | undefined>(() => {
    return this.queryParams()?.['p'];
  });

  readonly sourceInfo = computed(() => {
    const sourcePath = this.sourcePath();
    const bundle = this.bundle().value()!;

    if (!bundle || !sourcePath) return null;

    const size = bundle.sourceBreakdown.get(sourcePath);
    if (size === undefined) return null;

    const chunks = getChunksBySource(bundle, sourcePath);

    return {
      path: sourcePath,
      size,
      chunks,
    };
  });
}
