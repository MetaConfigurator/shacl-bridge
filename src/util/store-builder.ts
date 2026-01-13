// Common RDF and SHACL URIs
import { DataFactory, Store, Writer } from 'n3';
import { RDF_TYPE, XSD_BOOLEAN, XSD_INTEGER } from './rdf-terms';

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

  bothBlank(subject: string, predicate: string, object: string): this {
    this.store.addQuad(
      DataFactory.blankNode(subject),
      DataFactory.namedNode(predicate),
      DataFactory.blankNode(object)
    );
    return this;
  }

  /**
   * Adds a triple with an integer literal as the object
   */
  literalInt(subject: string, predicate: string, value: number, isBlankSubject = false): this {
    this.store.addQuad(
      isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value.toString(), DataFactory.namedNode(XSD_INTEGER))
    );
    return this;
  }

  /**
   * Adds a triple with a boolean literal as the object
   */
  literalBool(subject: string, predicate: string, value: boolean, isBlankSubject = false): this {
    this.store.addQuad(
      isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value.toString(), DataFactory.namedNode(XSD_BOOLEAN))
    );
    return this;
  }

  /**
   * Adds a triple with a plain string literal as the object
   */
  literalString(subject: string, predicate: string, value: string, isBlankSubject = false): this {
    this.store.addQuad(
      isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value)
    );
    return this;
  }

  /**
   * Adds a triple with a typed literal as the object
   */
  literal(
    subject: string,
    predicate: string,
    value: string,
    datatype: string,
    isBlankSubject = false
  ): this {
    this.store.addQuad(
      isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value, DataFactory.namedNode(datatype))
    );
    return this;
  }

  build() {
    return this.store;
  }

  write(): Promise<string> {
    const writer = new Writer({ format: 'text/turtle' });

    return new Promise((resolve, reject) => {
      // Add all quads from store
      this.store.forEach((quad) => {
        writer.addQuad(quad);
      });

      // Get the serialized output
      writer.end((error, result) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (error) reject(error);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        else resolve(result);
      });
    });
  }
}
