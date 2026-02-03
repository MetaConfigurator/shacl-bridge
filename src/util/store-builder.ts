import jsonld from 'jsonld';
import { DataFactory, Store, Writer } from 'n3';
import { RDF_FIRST, RDF_NIL, RDF_REST, RDF_TYPE, XSD_BOOLEAN, XSD_INTEGER } from './rdf-terms';

export class StoreBuilder {
  private store = new Store();
  private prefixes: Record<string, string> = {};

  withPrefixes(prefixes: Record<string, string>): this {
    this.prefixes = { ...this.prefixes, ...prefixes };
    return this;
  }

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

  list(
    subject: string,
    predicate: string,
    items: string[],
    isBlankSubject = false,
    itemsAreUris = false
  ): this {
    if (items.length === 0) {
      this.store.addQuad(
        isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
        DataFactory.namedNode(predicate),
        DataFactory.namedNode(RDF_NIL)
      );
      return this;
    }

    const listNodes = items.map((_, i) => DataFactory.blankNode(`list_${subject}_${String(i)}`));

    this.store.addQuad(
      isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      listNodes[0]
    );

    items.forEach((item, i) => {
      this.store.addQuad(
        listNodes[i],
        DataFactory.namedNode(RDF_FIRST),
        itemsAreUris ? DataFactory.namedNode(item) : DataFactory.literal(item)
      );
      this.store.addQuad(
        listNodes[i],
        DataFactory.namedNode(RDF_REST),
        i < items.length - 1 ? listNodes[i + 1] : DataFactory.namedNode(RDF_NIL)
      );
    });

    return this;
  }

  listOfBlanks(
    subject: string,
    predicate: string,
    blankIds: string[],
    isBlankSubject = false
  ): this {
    if (blankIds.length === 0) {
      this.store.addQuad(
        isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
        DataFactory.namedNode(predicate),
        DataFactory.namedNode(RDF_NIL)
      );
      return this;
    }

    const listNodes = blankIds.map((_, i) => DataFactory.blankNode(`list_${subject}_${String(i)}`));

    this.store.addQuad(
      isBlankSubject ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      listNodes[0]
    );

    blankIds.forEach((blankId, i) => {
      this.store.addQuad(
        listNodes[i],
        DataFactory.namedNode(RDF_FIRST),
        DataFactory.blankNode(blankId)
      );
      this.store.addQuad(
        listNodes[i],
        DataFactory.namedNode(RDF_REST),
        i < blankIds.length - 1 ? listNodes[i + 1] : DataFactory.namedNode(RDF_NIL)
      );
    });

    return this;
  }

  build() {
    return this.store;
  }

  write(): Promise<string> {
    const hasPrefixes = Object.keys(this.prefixes).length > 0;
    const writer = hasPrefixes
      ? new Writer({ format: 'text/turtle', prefixes: this.prefixes })
      : new Writer({ format: 'text/turtle' });

    return new Promise((resolve, reject) => {
      this.store.forEach((quad) => {
        writer.addQuad(quad);
      });

      writer.end((error, result) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (error) reject(error);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        else resolve(result);
      });
    });
  }

  async writeJsonLd(): Promise<string> {
    const nquads = await this.writeNQuads();
    const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });

    const context: Record<string, string> = {};
    for (const [prefix, uri] of Object.entries(this.prefixes)) {
      context[prefix] = uri;
    }

    const compacted = await jsonld.compact(doc, context);
    return JSON.stringify(compacted, null, 2);
  }

  private writeNQuads(): Promise<string> {
    const writer = new Writer({ format: 'application/n-quads' });

    return new Promise((resolve, reject) => {
      this.store.forEach((quad) => {
        writer.addQuad(quad);
      });

      writer.end((error, result) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (error) reject(error);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        else resolve(result);
      });
    });
  }
}
