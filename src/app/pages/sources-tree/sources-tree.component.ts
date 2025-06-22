import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BundleService } from '../../services/bundle.service';

interface TreeNode {
  name: string;
  path: string;
  size: number;
  isFile: boolean;
  children: TreeNode[];
  level: number;
}

@Component({
  selector: 'app-sources-tree',
  imports: [RouterLink],
  template: `
    @if (bundle(); as bundleData) {
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">Source Files</h2>
          <div class="text-sm text-gray-500">
            {{ bundleData.sourceBreakdown.size }} files •
            {{ formatSize(bundleData.totalSize) }} total
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm font-medium text-gray-500">Total Files</div>
            <div class="text-2xl font-semibold text-gray-900">
              {{ bundleData.sourceBreakdown.size }}
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm font-medium text-gray-500">Largest File</div>
            <div class="text-2xl font-semibold text-gray-900">
              {{ formatSize(getLargestFileSize()) }}
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm font-medium text-gray-500">Average Size</div>
            <div class="text-2xl font-semibold text-gray-900">
              {{ formatSize(getAverageFileSize()) }}
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <div class="text-sm font-medium text-gray-500">Node Modules</div>
            <div class="text-2xl font-semibold text-gray-900">
              {{ getNodeModulesCount() }}
            </div>
          </div>
        </div>

        <!-- File Tree -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">File Tree</h3>
          </div>
          <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            @for (node of sourceTree(); track node.path) {
              <div
                class="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                [style.padding-left.px]="24 + node.level * 20"
              >
                <div class="flex items-center min-w-0 flex-1">
                  <div class="flex-shrink-0 w-5 h-5 mr-3">
                    @if (node.isFile) {
                      <svg
                        class="w-5 h-5 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    } @else {
                      <svg
                        class="w-5 h-5 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                        ></path>
                      </svg>
                    }
                  </div>
                  <div class="min-w-0 flex-1">
                    @if (node.isFile) {
                      <a
                        [routerLink]="['/bundle/sources', node.path]"
                        class="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                      >
                        {{ node.name }}
                      </a>
                    } @else {
                      <div class="text-sm font-medium text-gray-900 truncate">
                        {{ node.name }}
                      </div>
                    }
                    @if (node.path !== node.name) {
                      <div class="text-xs text-gray-500 truncate">
                        {{ node.path }}
                      </div>
                    }
                  </div>
                </div>
                <div class="text-right ml-4">
                  @if (node.isFile) {
                    <div class="text-sm font-medium text-gray-900">
                      {{ formatSize(node.size) }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ getPercentage(node.size, bundleData.totalSize) }}%
                    </div>
                  } @else {
                    <div class="text-sm text-gray-500">
                      {{ node.children.length }} items
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Top Files by Size -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Largest Files</h3>
          </div>
          <div class="divide-y divide-gray-200">
            @for (file of topFilesBySize(); track file[0]) {
              <div class="px-6 py-4 flex items-center justify-between">
                <div class="flex items-center min-w-0 flex-1">
                  <div
                    class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"
                  >
                    <svg
                      class="w-5 h-5 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <div class="ml-4 min-w-0 flex-1">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      {{ getFileName(file[0]) }}
                    </div>
                    <div class="text-sm text-gray-500 truncate">
                      {{ file[0] }}
                    </div>
                  </div>
                </div>
                <div class="text-right ml-4">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatSize(file[1]) }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ getPercentage(file[1], bundleData.totalSize) }}%
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class SourcesTreeComponent {
  private readonly bundleService = inject(BundleService);

  readonly bundle = this.bundleService.bundle;

  readonly sourceTree = computed(() => {
    const bundle = this.bundle();
    if (!bundle) return [];

    const tree: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();

    // Create tree structure
    for (const [path, size] of bundle.sourceBreakdown.entries()) {
      const parts = path.split('/');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!pathMap.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            path: currentPath,
            size: isLast ? size : 0,
            isFile: isLast,
            children: [],
            level: i,
          };

          pathMap.set(currentPath, node);

          if (i === 0) {
            tree.push(node);
          } else {
            const parentPath = parts.slice(0, i).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
              parent.children.push(node);
            }
          }
        }
      }
    }

    // Flatten tree for display
    const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
      const result: TreeNode[] = [];
      for (const node of nodes.sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name);
      })) {
        result.push(node);
        if (node.children.length > 0) {
          result.push(...flattenTree(node.children));
        }
      }
      return result;
    };

    return flattenTree(tree);
  });

  topFilesBySize() {
    const bundle = this.bundle();
    if (!bundle) return [];

    return Array.from(bundle.sourceBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getPercentage(value: number, total: number): string {
    return ((value / total) * 100).toFixed(1);
  }

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  getLargestFileSize(): number {
    const bundle = this.bundle();
    if (!bundle || bundle.sourceBreakdown.size === 0) return 0;

    return Math.max(...Array.from(bundle.sourceBreakdown.values()));
  }

  getAverageFileSize(): number {
    const bundle = this.bundle();
    if (!bundle || bundle.sourceBreakdown.size === 0) return 0;

    const total = Array.from(bundle.sourceBreakdown.values()).reduce(
      (sum, size) => sum + size,
      0,
    );
    return total / bundle.sourceBreakdown.size;
  }

  getNodeModulesCount(): number {
    const bundle = this.bundle();
    if (!bundle) return 0;

    return Array.from(bundle.sourceBreakdown.keys()).filter((path) =>
      path.includes('node_modules'),
    ).length;
  }
}
