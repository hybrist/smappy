import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SourceDetailHeaderComponent } from '../../components/source-detail-header/source-detail-header.component';
import { SourceSemanticAnalysisComponent } from '../../components/source-semantic-analysis/source-semantic-analysis.component';
import { currentBundle } from '../../resolvers/bundle';
import { BundleService } from '../../services/bundle.service';

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
  styles: [],
})
export class SourceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bundleService = inject(BundleService);

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

    const chunks = this.bundleService.getChunksBySource(bundle, sourcePath);

    return {
      path: sourcePath,
      size,
      chunks,
    };
  });

  readonly similarFiles = computed(() => {
    const info = this.sourceInfo();
    const bundle = this.bundle().value()!;
    if (!info || !bundle) return [];

    const fileType = this.getFileType(info.path);

    return Array.from(bundle.sourceBreakdown.entries())
      .filter(
        ([path]) => path !== info.path && this.getFileType(path) === fileType,
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  });

  readonly sourceLines = computed(() => {
    const info = this.sourceInfo();
    if (!info) return null;
    const src = this.bundleService.getSourceContent(
      this.bundle().value()!,
      info.path,
    );
    if (!src) return null;
    return src.split('\n').map((content, index) => ({
      line: index + 1,
      content,
      size: 0,
    }));
  });

  private getFileType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
}
