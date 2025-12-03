import { Quad, Store } from 'n3';

export interface TripleIndex {
  quadsIndex: Map<string, Quad[]>;
  blankNodesIndex: Set<string>;
  namedShapesIndex: Set<string>;
}

export class Indexer {
  constructor(private readonly store: Store) {}

  build(): TripleIndex {
    const quads = new Map<string, Quad[]>();
    const blanks = new Set<string>();
    const namedShapes = new Set<string>();

    this.store.getQuads(null, null, null, null).forEach((quad) => {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      if (!quads.has(subject)) {
        quads.set(subject, [quad]);
      } else {
        quads.get(subject)?.push(quad);
      }

      const isBlankNode = quad.subject.termType === 'BlankNode';
      const isShapeType =
        predicate.endsWith('type') &&
        (object.endsWith('NodeShape') || object.endsWith('PropertyShape'));

      if (isBlankNode) blanks.add(subject);

      if (isShapeType && !isBlankNode) namedShapes.add(subject);
    });

    return { quadsIndex: quads, blankNodesIndex: blanks, namedShapesIndex: namedShapes };
  }
}
