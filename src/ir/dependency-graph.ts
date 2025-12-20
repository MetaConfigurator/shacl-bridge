import { TripleIndex } from './indexer';
import { Quad } from 'n3';

export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  cycles: Map<string, Set<string>>;
}

export class DependencyGraphBuilder {
  private graph: DependencyGraph = {
    dependencies: new Map<string, Set<string>>(),
    dependents: new Map<string, Set<string>>(),
    cycles: new Map<string, Set<string>>(),
  };

  constructor(private readonly index: TripleIndex) {}

  build(): DependencyGraph {
    const { quadsIndex, blankNodesIndex } = this.index;

    // First pass: Build dependency and dependent relationships
    quadsIndex.forEach((quads, subject) => {
      this.findDependenciesForSubject(quads, blankNodesIndex, subject);
    });

    // Second pass: Detect cycles using DFS
    this.detectCycles();

    return this.graph;
  }

  private findDependenciesForSubject(quads: Quad[], blankNodesIndex: Set<string>, subject: string) {
    const dependenciesForCurrentSubject: Set<string> = new Set<string>();
    quads.forEach((quad) => {
      const object = quad.object.value;
      if (blankNodesIndex.has(object) && !dependenciesForCurrentSubject.has(object)) {
        dependenciesForCurrentSubject.add(object);
        this.addDependents(object, subject);
      }
    });

    if (dependenciesForCurrentSubject.size > 0)
      this.graph.dependencies.set(subject, dependenciesForCurrentSubject);
  }

  private detectCycles(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const recStack: string[] = [];

    const dfs = (node: string): void => {
      // If we encounter a node in the current path, we found a cycle
      if (visiting.has(node)) {
        const cycleStartIndex = recStack.indexOf(node);
        const cycleNodes = recStack.slice(cycleStartIndex);
        cycleNodes.push(node); // Include the node that closes the cycle

        const cycleSet = new Set<string>(cycleNodes);

        // Store the cycle for all nodes involved in it
        cycleNodes.forEach((cycleNode) => {
          if (!this.graph.cycles.has(cycleNode)) {
            this.graph.cycles.set(cycleNode, new Set<string>());
          }
          const cycleNodeSet = this.graph.cycles.get(cycleNode);
          if (cycleNodeSet) {
            cycleSet.forEach((n) => {
              cycleNodeSet.add(n);
            });
          }
        });
        return;
      }

      // Skip if already fully processed
      if (visited.has(node)) {
        return;
      }

      // Mark as currently visiting
      visiting.add(node);
      recStack.push(node);

      // Visit all dependencies
      const deps = this.graph.dependencies.get(node);
      if (deps) {
        deps.forEach((dep) => {
          dfs(dep);
        });
      }

      // Done visiting this node
      recStack.pop();
      visiting.delete(node);
      visited.add(node);
    };

    // Run DFS from all nodes that have dependencies
    this.graph.dependencies.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });
  }

  private addDependents(object: string, subject: string) {
    if (!this.graph.dependents.has(object)) {
      this.graph.dependents.set(object, new Set<string>());
    }
    const dependentsSet = this.graph.dependents.get(object);
    if (dependentsSet) {
      dependentsSet.add(subject);
    }
  }
}
