import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SourceDetailHeaderComponent } from '../../components/source-detail-header/source-detail-header.component';
import { SourceInfoCardsComponent } from '../../components/source-info-cards/source-info-cards.component';
import { SourceChunksListComponent } from '../../components/source-chunks-list/source-chunks-list.component';
import { SourceCodeViewerComponent, SourceLine } from '../../components/source-code-viewer/source-code-viewer.component';
import { SourceAnalysisComponent } from '../../components/source-analysis/source-analysis.component';
import { SimilarFilesComponent } from '../../components/similar-files/similar-files.component';

@Component({
  selector: 'app-source-detail',
  imports: [
    RouterLink,
    SourceDetailHeaderComponent,
    SourceInfoCardsComponent,
    SourceChunksListComponent,
    SourceCodeViewerComponent,
    SourceAnalysisComponent,
    SimilarFilesComponent,
  ],
  template: `
    @if (sourceInfo(); as info) {
      <div class="space-y-6">
        <section appSourceDetailHeader [path]="info.path" [size]="info.size"></section>
        <section appSourceInfoCards [size]="info.size" [chunksCount]="info.chunks.length"></section>
        <section appSourceChunksList [chunks]="info.chunks"></section>
        <section appSourceCodeViewer [sourceLines]="sourceLines()"></section>
        <section appSourceAnalysis [path]="info.path" [size]="info.size"></section>
        <section appSimilarFiles [similarFiles]="similarFiles()" [path]="info.path"></section>
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">Source file not found</p>
        <a
          routerLink="/bundle/sources"
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

  private readonly queryParams = toSignal(this.route.queryParams);
  private readonly sourcePath = computed<string | undefined>(() => {
    return this.queryParams()?.['p'];
  });

  readonly sourceInfo = computed(() => {
    const sourcePath = this.sourcePath();
    const bundle = this.bundleService.bundle();

    if (!bundle || !sourcePath) return null;

    const size = bundle.sourceBreakdown.get(sourcePath);
    if (size === undefined) return null;

    const chunks = this.bundleService.getChunksBySource(sourcePath);

    return {
      path: sourcePath,
      size,
      chunks,
    };
  });

  readonly similarFiles = computed(() => {
    const info = this.sourceInfo();
    const bundle = this.bundleService.bundle();
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
    const src = this.bundleService.getSourceContent(info.path);
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
