import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'bundle',
    loadComponent: () =>
      import('./layouts/bundle-layout/bundle-layout.component').then(
        (m) => m.BundleLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/bundle-overview/bundle-overview.component').then(
            (m) => m.BundleOverviewComponent,
          ),
      },
      {
        path: 'chunks',
        loadComponent: () =>
          import('./pages/chunks-list/chunks-list.component').then(
            (m) => m.ChunksListComponent,
          ),
      },
      {
        path: 'chunks/:chunkId',
        loadComponent: () =>
          import('./pages/chunk-detail/chunk-detail.component').then(
            (m) => m.ChunkDetailComponent,
          ),
      },
      {
        path: 'sources',
        loadComponent: () =>
          import('./pages/sources-tree/sources-tree.component').then(
            (m) => m.SourcesTreeComponent,
          ),
      },
      {
        path: 'sources/**',
        loadComponent: () =>
          import('./pages/source-detail/source-detail.component').then(
            (m) => m.SourceDetailComponent,
          ),
      },
      {
        path: 'analysis',
        loadComponent: () =>
          import('./pages/analysis-overview/analysis-overview.component').then(
            (m) => m.AnalysisOverviewComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '/home' },
];
