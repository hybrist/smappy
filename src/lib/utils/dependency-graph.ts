import type { DependencyGraph } from '$lib/server/query/types.js';

export interface DependencyCycleEdge {
  from: number;
  to: number;
}

export interface DependencyCycle {
  /**
   * Module IDs that participate in the cycle.
   */
  nodes: number[];
  /**
   * Directed edges that form the cycle. Each edge is represented by its source and target IDs.
   */
  edges: DependencyCycleEdge[];
}

export interface DependencyCycleAnalysis {
  /**
   * All strongly connected components that represent cycles.
   */
  cycles: DependencyCycle[];
  /**
   * Unique module IDs that are part of at least one cycle.
   */
  cycleNodeIds: number[];
  /**
   * Directed edges (expressed as `${from}:${to}`) that participate in cycles.
   */
  cycleEdgeKeys: string[];
}

/**
 * Analyze a dependency graph and detect all circular dependency components.
 *
 * @param graph Dependency graph with nodes and edges.
 * @returns Details about cycles including participating nodes and edges.
 */
export function analyzeDependencyCycles(graph: DependencyGraph): DependencyCycleAnalysis {
  const adjacency = new Map<number, number[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.from);
    if (list) {
      list.push(edge.to);
    } else {
      adjacency.set(edge.from, [edge.to]);
    }
  }

  const indexMap = new Map<number, number>();
  const lowLinkMap = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const cycles: DependencyCycle[] = [];

  let indexCounter = 0;

  function strongConnect(nodeId: number) {
    indexMap.set(nodeId, indexCounter);
    lowLinkMap.set(nodeId, indexCounter);
    indexCounter += 1;

    stack.push(nodeId);
    onStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!indexMap.has(neighbor)) {
        strongConnect(neighbor);
        const neighborLowLink = lowLinkMap.get(neighbor)!;
        const currentLowLink = lowLinkMap.get(nodeId)!;
        if (neighborLowLink < currentLowLink) {
          lowLinkMap.set(nodeId, neighborLowLink);
        }
      } else if (onStack.has(neighbor)) {
        const neighborIndex = indexMap.get(neighbor)!;
        const currentLowLink = lowLinkMap.get(nodeId)!;
        if (neighborIndex < currentLowLink) {
          lowLinkMap.set(nodeId, neighborIndex);
        }
      }
    }

    if (lowLinkMap.get(nodeId) === indexMap.get(nodeId)) {
      const component: number[] = [];
      let popped: number | undefined;
      do {
        popped = stack.pop();
        if (popped === undefined) break;
        onStack.delete(popped);
        component.push(popped);
      } while (popped !== nodeId);

      component.sort((a, b) => a - b);

      const componentSet = new Set(component);
      const edgesInComponent = graph.edges.filter(
        (edge) => componentSet.has(edge.from) && componentSet.has(edge.to),
      );
      const hasSelfLoop = edgesInComponent.some((edge) => edge.from === edge.to);

      if (component.length > 1 || hasSelfLoop) {
        cycles.push({
          nodes: component,
          edges: edgesInComponent.map((edge) => ({ from: edge.from, to: edge.to })),
        });
      }
    }
  }

  for (const node of graph.nodes) {
    if (!indexMap.has(node.id)) {
      strongConnect(node.id);
    }
  }

  const cycleNodeSet = new Set<number>();
  const cycleEdgeSet = new Set<string>();
  for (const cycle of cycles) {
    for (const nodeId of cycle.nodes) {
      cycleNodeSet.add(nodeId);
    }
    for (const edge of cycle.edges) {
      cycleEdgeSet.add(`${edge.from}:${edge.to}`);
    }
  }

  return {
    cycles,
    cycleNodeIds: Array.from(cycleNodeSet.values()).sort((a, b) => a - b),
    cycleEdgeKeys: Array.from(cycleEdgeSet.values()).sort(),
  };
}
