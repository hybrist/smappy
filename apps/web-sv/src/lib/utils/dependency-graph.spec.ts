import { describe, it, expect } from 'vitest';
import type { DependencyGraph } from '$lib/server/query/types.js';
import { analyzeDependencyCycles } from './dependency-graph.js';

function createGraph(
  nodes: Array<{ id: number }>,
  edges: Array<{ from: number; to: number }>,
): DependencyGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      filePath: `module-${node.id}.js`,
      bundledSize: 0,
      isThirdParty: false,
      packageName: null,
    })),
    edges: edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      importType: 'static',
      importedSymbols: null,
    })),
  };
}

describe('analyzeDependencyCycles', () => {
  it('returns empty analysis for acyclic graph', () => {
    const graph = createGraph(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    );

    const result = analyzeDependencyCycles(graph);

    expect(result.cycles).toHaveLength(0);
    expect(result.cycleNodeIds).toEqual([]);
    expect(result.cycleEdgeKeys).toEqual([]);
  });

  it('identifies multi-node cycles', () => {
    const graph = createGraph(
      [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 1 },
        { from: 3, to: 4 },
      ],
    );

    const result = analyzeDependencyCycles(graph);

    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0].nodes).toEqual([1, 2, 3]);
    expect(result.cycles[0].edges).toEqual(
      expect.arrayContaining([
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 1 },
      ]),
    );
    expect(result.cycleNodeIds).toEqual([1, 2, 3]);
    expect(result.cycleEdgeKeys).toEqual(['1:2', '2:3', '3:1']);
  });

  it('detects self-referential cycles', () => {
    const graph = createGraph(
      [{ id: 1 }, { id: 2 }],
      [
        { from: 1, to: 1 },
        { from: 1, to: 2 },
      ],
    );

    const result = analyzeDependencyCycles(graph);

    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0].nodes).toEqual([1]);
    expect(result.cycles[0].edges).toEqual([{ from: 1, to: 1 }]);
    expect(result.cycleNodeIds).toEqual([1]);
    expect(result.cycleEdgeKeys).toEqual(['1:1']);
  });

  it('handles multiple disjoint cycles', () => {
    const graph = createGraph(
      [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      [
        { from: 1, to: 2 },
        { from: 2, to: 1 },
        { from: 3, to: 4 },
        { from: 4, to: 5 },
        { from: 5, to: 3 },
      ],
    );

    const result = analyzeDependencyCycles(graph);

    expect(result.cycles).toHaveLength(2);
    expect(result.cycleNodeIds).toEqual([1, 2, 3, 4, 5]);
    expect(result.cycleEdgeKeys.sort()).toEqual(['1:2', '2:1', '3:4', '4:5', '5:3']);
  });
});
