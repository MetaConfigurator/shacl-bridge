import { TripleIndex } from './indexer';

export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, string>;
}

export class DependencyGraphBuilder {
  constructor(private readonly index: TripleIndex) {}

  build(): DependencyGraph {
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, string>();

    const quadsIndex = this.index.quadsIndex;
    const blankNodesIndex = this.index.blankNodesIndex;

    quadsIndex.forEach((quads, subject) => {
      const dependenciesForSubject = new Set<string>();
      quads.forEach((quad) => {
        const object = quad.object.value;

        if (blankNodesIndex.has(object)) {
          dependenciesForSubject.add(object);
          dependents.set(object, subject);
        }
      });
      if (dependenciesForSubject.size > 0) dependencies.set(subject, dependenciesForSubject);
    });

    return { dependencies, dependents };
  }
}
