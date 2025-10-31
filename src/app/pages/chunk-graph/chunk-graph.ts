import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormatSizePipe } from '../../pipes/format-size.pipe';
import { currentBundle } from '../../resolvers/bundle';
import { ChunkGraphService } from '../../services/chunk-graph.service';

@Component({
  selector: 'app-chunk-graph',
  imports: [NgClass, FormatSizePipe],
  template: `
    @if (chunkGraph() && bundle().value(); as bundleData) {
      @let graph = chunkGraph()!;
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">Chunk Import Graph</h2>
          <div class="text-sm text-gray-500">
            {{ graph.nodes.length }} chunks •
            {{ graph.edges.length }} dependencies
          </div>
        </div>

        <!-- Legend -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <svg width="40" height="2" class="inline-block">
                <line
                  x1="0"
                  y1="1"
                  x2="40"
                  y2="1"
                  stroke="#94a3b8"
                  stroke-width="2"
                />
                <polygon points="30,0 40,1 30,2" fill="#94a3b8" />
              </svg>
              <span class="text-gray-700">Static Import</span>
            </div>
            <div class="flex items-center gap-2">
              <svg width="40" height="2" class="inline-block">
                <line
                  x1="0"
                  y1="1"
                  x2="40"
                  y2="1"
                  stroke="#10b981"
                  stroke-width="2"
                  stroke-dasharray="8,4"
                />
                <polygon points="30,0 40,1 30,2" fill="#10b981" />
              </svg>
              <span class="text-gray-700">Dynamic Import</span>
            </div>
          </div>
        </div>

        <!-- Graph Visualization -->
        <div class="bg-white rounded-lg shadow p-6">
          <svg
            [attr.viewBox]="'0 0 ' + getSVGWidth() + ' ' + getSVGHeight()"
            class="w-full border border-gray-200 rounded-lg"
            style="min-height: 600px;"
          >
            <!-- Edges -->
            @for (edge of graph.edges; track edge.source + edge.target) {
              <line
                [attr.x1]="getNodeX(edge.source)"
                [attr.y1]="getNodeY(edge.source)"
                [attr.x2]="getNodeX(edge.target)"
                [attr.y2]="getNodeY(edge.target)"
                [attr.stroke]="edge.type === 'dynamic' ? '#10b981' : '#94a3b8'"
                stroke-width="2"
                [attr.stroke-dasharray]="
                  edge.type === 'dynamic' ? '8,4' : 'none'
                "
                [attr.marker-end]="
                  edge.type === 'dynamic'
                    ? 'url(#arrowhead-dynamic)'
                    : 'url(#arrowhead-static)'
                "
              />
            }

            <!-- Arrow markers -->
            <defs>
              <marker
                id="arrowhead-static"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
              </marker>
              <marker
                id="arrowhead-dynamic"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
              </marker>
            </defs>

            <!-- Nodes -->
            @for (node of graph.nodes; track node.id) {
              <g>
                <circle
                  [attr.cx]="getNodeX(node.id)"
                  [attr.cy]="getNodeY(node.id)"
                  [attr.r]="getNodeRadius(node.size)"
                  fill="#3b82f6"
                  stroke="#1e40af"
                  stroke-width="2"
                  [attr.opacity]="0.8"
                />
                <text
                  [attr.x]="getNodeX(node.id)"
                  [attr.y]="getNodeY(node.id) + getNodeRadius(node.size) + 15"
                  text-anchor="middle"
                  class="text-xs font-medium"
                  fill="#374151"
                >
                  {{ getShortFileName(node.fileName) }}
                </text>
              </g>
            }
          </svg>
        </div>

        <!-- Chunk Details Table -->
        <div class="bg-white rounded-lg shadow">
          <div
            class="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
          >
            <h3 class="text-lg font-medium text-gray-900">
              Chunk Dependencies
            </h3>
          </div>
          <div class="divide-y divide-gray-200">
            @for (node of graph.nodes; track node.id) {
              <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">
                      {{ node.fileName }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ node.size | formatSize }}
                    </div>
                  </div>
                  <div class="flex items-center space-x-8">
                    <div class="text-right">
                      <div class="text-xs text-gray-500">Static Imports</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {{ getStaticImportCount(node.id) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-gray-500">Dynamic Imports</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {{ getDynamicImportCount(node.id) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-gray-500">Dependents</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {{ node.dependentCount }}
                      </div>
                    </div>
                  </div>
                </div>
                @if (getChunkDependenciesWithType(node.id).length > 0) {
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (
                      dep of getChunkDependenciesWithType(node.id);
                      track dep.name
                    ) {
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                        [ngClass]="
                          dep.type === 'dynamic'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        "
                      >
                        {{ dep.name }}
                        @if (dep.type === 'dynamic') {
                          <svg
                            class="w-3 h-3 ml-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                            ></path>
                            <path
                              d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                            ></path>
                          </svg>
                        }
                      </span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class ChunkGraph {
  private readonly chunkGraphService = inject(ChunkGraphService);
  protected readonly bundle = currentBundle();

  protected readonly chunkGraph = computed(() => {
    const bundleData = this.bundle().value();
    if (!bundleData) return null;
    return this.chunkGraphService.buildChunkGraph(bundleData);
  });

  protected readonly bundleId = computed(() => this.bundle().value()!.bundleId);

  // SVG layout helpers
  getSVGWidth(): number {
    return 1200;
  }

  getSVGHeight(): number {
    return 600;
  }

  getNodeX(nodeId: string): number {
    const graph = this.chunkGraph();
    if (!graph) return 0;
    const index = graph.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) return 0;

    // Layout in a circle
    const angle = (index / graph.nodes.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 200;
    return this.getSVGWidth() / 2 + radius * Math.cos(angle);
  }

  getNodeY(nodeId: string): number {
    const graph = this.chunkGraph();
    if (!graph) return 0;
    const index = graph.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) return 0;

    // Layout in a circle
    const angle = (index / graph.nodes.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 200;
    return this.getSVGHeight() / 2 + radius * Math.sin(angle);
  }

  getNodeRadius(size: number): number {
    // Scale radius based on size, with min and max bounds
    const bundle = this.bundle().value();
    if (!bundle) return 20;
    const maxSize = Math.max(...bundle.chunks.map((c) => c.size));
    const minRadius = 15;
    const maxRadius = 50;
    return minRadius + (size / maxSize) * (maxRadius - minRadius);
  }

  getShortFileName(fileName: string): string {
    // Remove extension and limit length
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');
    return withoutExt.length > 15
      ? withoutExt.substring(0, 12) + '...'
      : withoutExt;
  }

  getChunkDependencies(nodeId: string): string[] {
    const graph = this.chunkGraph();
    if (!graph) return [];
    return graph.edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => {
        const targetNode = graph.nodes.find((n) => n.id === edge.target);
        return targetNode?.fileName || edge.target;
      });
  }

  getChunkDependenciesWithType(
    nodeId: string,
  ): Array<{ name: string; type: 'static' | 'dynamic' }> {
    const graph = this.chunkGraph();
    if (!graph) return [];
    return graph.edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => {
        const targetNode = graph.nodes.find((n) => n.id === edge.target);
        return {
          name: targetNode?.fileName || edge.target,
          type: edge.type,
        };
      });
  }

  getStaticImportCount(nodeId: string): number {
    const graph = this.chunkGraph();
    if (!graph) return 0;
    return graph.edges.filter(
      (edge) => edge.source === nodeId && edge.type === 'static',
    ).length;
  }

  getDynamicImportCount(nodeId: string): number {
    const graph = this.chunkGraph();
    if (!graph) return 0;
    return graph.edges.filter(
      (edge) => edge.source === nodeId && edge.type === 'dynamic',
    ).length;
  }
}
