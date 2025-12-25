import { BlankNode, Term } from 'n3';

/**
 * Detects cycles in a dependency graph using Tarjan's algorithm for finding
 * strongly connected components (SCCs).
 *
 * Tarjan's algorithm is optimal with O(V+E) time complexity where V is the
 * number of vertices and E is the number of edges.
 */
export class CycleDetector {
  private index = 0;
  private stack: Term[] = [];
  private indices = new Map<Term, number>();
  private lowlinks = new Map<Term, number>();
  private onStack = new Set<Term>();
  private cycles = new Map<Term, Set<BlankNode>>();

  constructor(private readonly dependencies: Map<Term, Set<Term>>) {}

  /**
   * Detects all cycles in the dependency graph.
   *
   * @returns A new map where each key is a node involved in a cycle, and the value
   *          is the set of all nodes in that cycle (the strongly connected component)
   */
  detect(): Map<Term, Set<BlankNode>> {
    // Reset state for fresh detection
    this.cycles = new Map<Term, Set<BlankNode>>();
    this.index = 0;
    this.stack = [];
    this.indices = new Map<Term, number>();
    this.lowlinks = new Map<Term, number>();
    this.onStack = new Set<Term>();

    for (const node of this.dependencies.keys()) {
      if (!this.indices.has(node)) {
        this.strongConnect(node);
      }
    }

    return this.cycles;
  }

  /**
   * Tarjan's strongly connected components algorithm.
   * Finds all nodes that are mutually reachable (form cycles).
   */
  private strongConnect(node: Term): void {
    // Set the depth index for this node
    this.indices.set(node, this.index);
    this.lowlinks.set(node, this.index);
    this.index++;
    this.stack.push(node);
    this.onStack.add(node);

    // Consider successors (dependencies) of this node
    const deps = this.dependencies.get(node) ?? new Set<Term>();
    for (const dep of deps) {
      if (!this.indices.has(dep)) {
        // Successor has not yet been visited; recurse on it
        this.strongConnect(dep);
        const nodeLowlink = this.lowlinks.get(node) ?? 0;
        const depLowlink = this.lowlinks.get(dep) ?? 0;
        this.lowlinks.set(node, Math.min(nodeLowlink, depLowlink));
      } else if (this.onStack.has(dep)) {
        // Successor is on the stack and hence in the current SCC
        const nodeLowlink = this.lowlinks.get(node) ?? 0;
        const depIndex = this.indices.get(dep) ?? 0;
        this.lowlinks.set(node, Math.min(nodeLowlink, depIndex));
      }
    }

    // If node is a root node, pop the stack and generate an SCC
    if (this.lowlinks.get(node) === this.indices.get(node)) {
      const scc: Term[] = [];
      let w = this.stack.pop();
      while (w) {
        this.onStack.delete(w);
        scc.push(w);
        if (w === node) break;
        w = this.stack.pop();
      }

      // Only store if it's a real cycle (size > 1) or a self-loop
      if (scc.length > 1 || deps.has(node)) {
        const sccSet = new Set<BlankNode>(scc as BlankNode[]);
        for (const term of scc) {
          this.cycles.set(term, sccSet);
        }
      }
    }
  }
}
