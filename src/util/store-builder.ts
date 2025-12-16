// Common RDF and SHACL URIs
import { DataFactory, Store } from 'n3';
import { RDF_TYPE } from './rdf-terms';

export class StoreBuilder {
  private store = new Store();

  shape(shapeUri: string, shapeType: string): this {
    this.store.addQuad(
      DataFactory.namedNode(shapeUri),
      DataFactory.namedNode(RDF_TYPE),
      DataFactory.namedNode(shapeType)
    );
    return this;
  }

  triple(subject: string, predicate: string, object: string, isBlank: boolean): this {
    this.store.addQuad(
      DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      isBlank ? DataFactory.blankNode(object) : DataFactory.namedNode(object)
    );
    return this;
  }

  blank(blankNodeId: string, predicate: string, object: string): this {
    this.store.addQuad(
      DataFactory.blankNode(blankNodeId),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(object)
    );
    return this;
  }

  build() {
    return this.store;
  }
}
