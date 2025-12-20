import { Quad, Store } from 'n3';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SHACL_NODE_SHAPE = 'http://www.w3.org/ns/shacl#NodeShape';
const SHACL_PROPERTY_SHAPE = 'http://www.w3.org/ns/shacl#PropertyShape';

export interface TripleIndex {
  quadsIndex: Map<string, Quad[]>;
  blankNodesIndex: Set<string>;
  namedShapesIndex: Set<string>;
}

function isBlankNode(quad: Quad): boolean {
  return quad.subject.termType === 'BlankNode';
}

function isAShape(quad: Quad): boolean {
  return (
    quad.predicate.value === RDF_TYPE &&
    (quad.object.value === SHACL_NODE_SHAPE || quad.object.value === SHACL_PROPERTY_SHAPE)
  );
}

export class Indexer {
  constructor(private readonly store: Store) {}

  build(): TripleIndex {
    const quads = new Map<string, Quad[]>();
    const blanks = new Set<string>();
    const namedShapes = new Set<string>();

    this.store.getQuads(null, null, null, null).forEach((quad) => {
      const subject = quad.subject.value;

      if (!quads.has(subject)) {
        quads.set(subject, []);
      }
      quads.get(subject)?.push(quad);

      if (isBlankNode(quad)) {
        blanks.add(subject);
        return;
      }

      if (isAShape(quad)) namedShapes.add(subject);
    });

    return { quadsIndex: quads, blankNodesIndex: blanks, namedShapesIndex: namedShapes };
  }
}
