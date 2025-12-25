import { BlankNode, Quad, Quad_Subject, Term, Util } from 'n3';
import { RDF_TYPE, SHACL_NODE_SHAPE, SHACL_PROPERTY_SHAPE } from '../util/rdf-terms';
import { ShaclDocument } from '../shacl/shacl-document';
import isBlankNode = Util.isBlankNode;

export interface Index {
  quads: Map<Term, Quad[]>;
  blanks: BlankNode[];
  shapes: Quad_Subject[];
}

export class Indexer {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  build(): Index {
    // Use null for graphId to match any graph when graphId is empty
    const graphFilter = this.shaclDocument.graphId || null;
    const quads = new Map(
      this.shaclDocument.subjects.map((subject) => [
        subject,
        this.shaclDocument.store.getQuads(subject, null, null, graphFilter),
      ])
    );

    const blankNodes = this.shaclDocument.subjects.filter((subject) => isBlankNode(subject));

    const nodeShapes = this.shaclDocument.store
      .getQuads(null, RDF_TYPE, SHACL_NODE_SHAPE, graphFilter)
      .map((quad) => quad.subject);

    const propertyShapes = this.shaclDocument.store
      .getQuads(null, RDF_TYPE, SHACL_PROPERTY_SHAPE, graphFilter)
      .map((quad) => quad.subject);

    return {
      quads: quads,
      blanks: [...new Set(blankNodes)],
      shapes: [...new Set([...nodeShapes, ...propertyShapes])],
    };
  }
}
