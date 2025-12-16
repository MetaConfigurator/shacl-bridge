import { TripleIndex } from './indexer';
import { Quad } from 'n3';

/**
 * Represents the dependency graph between SHACL shapes.
 *
 * In SHACL, shapes can reference blank nodes (anonymous shapes). This graph tracks
 * these relationships to enable correct topological ordering during shape resolution.
 *
 * @property dependencies - Maps each shape to the set of blank nodes it depends on.
 *                          Only shapes with dependencies are included in this map.
 * @property dependents - Maps each blank node to its parent shape (inverse of dependencies).
 */
export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export class DependencyGraphBuilder {
  constructor(private readonly index: TripleIndex) {}

  build(): DependencyGraph {
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, Set<string>>();

    const { quadsIndex, blankNodesIndex } = this.index;

    quadsIndex.forEach((quads, subject) => {
      this.findDependenciesForSubject(quads, blankNodesIndex, subject, dependencies, dependents);
    });

    return { dependencies, dependents };
  }

  private findDependenciesForSubject(
    quads: Quad[],
    blankNodesIndex: Set<string>,
    subject: string,
    dependencies: Map<string, Set<string>>,
    dependents: Map<string, Set<string>>
  ) {
    const dependenciesForCurrentSubject: Set<string> = new Set<string>();
    quads.forEach((quad) => {
      const object = quad.object.value;
      if (blankNodesIndex.has(object) && !dependenciesForCurrentSubject.has(object)) {
        dependenciesForCurrentSubject.add(object);
        this.addDependents(dependents, object, subject);
      }
    });

    if (dependenciesForCurrentSubject.size > 0)
      dependencies.set(subject, dependenciesForCurrentSubject);
  }

  private addDependents(dependents: Map<string, Set<string>>, object: string, subject: string) {
    if (!dependents.has(object)) dependents.set(object, new Set<string>());
    if (dependents.has(object) && !dependents.get(object)?.has(subject))
      dependents.get(object)?.add(subject);
  }
}
