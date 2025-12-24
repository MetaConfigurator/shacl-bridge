import { BlankNode, Quad, Quad_Subject, Util } from 'n3';
import { RDF_TYPE, SHACL_NODE_SHAPE, SHACL_PROPERTY_SHAPE } from '../util/rdf-terms';
import { ShaclDocument } from '../shacl/shacl-document';
import isBlankNode = Util.isBlankNode;

export interface Index {
  quads: Map<string, Quad[]>;
  blanks: BlankNode[];
  shapes: Quad_Subject[];
}

export class Indexer {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  build(): Index {
    const quads = new Map(
      this.shaclDocument.subjects.map((subject) => [
        subject.value,
        this.shaclDocument.store.getQuads(subject, null, null, this.shaclDocument.graphId),
      ])
    );

    const blankNodes = this.shaclDocument.subjects.filter((subject) => isBlankNode(subject));

    const nodeShapes = this.shaclDocument.store
      .getQuads(null, RDF_TYPE, SHACL_NODE_SHAPE, this.shaclDocument.graphId)
      .map((quad) => quad.subject);

    const propertyShapes = this.shaclDocument.store
      .getQuads(null, RDF_TYPE, SHACL_PROPERTY_SHAPE, this.shaclDocument.graphId)
      .map((quad) => quad.subject);

    return {
      quads: quads,
      blanks: [...new Set(blankNodes)],
      shapes: [...new Set([...nodeShapes, ...propertyShapes])],
    };
  }
}
