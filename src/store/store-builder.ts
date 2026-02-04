import jsonld from 'jsonld';
import { BlankNode, DataFactory, Literal, NamedNode, Quad, Store, Writer } from 'n3';
import {
  RDF_FIRST,
  RDF_NIL,
  RDF_REST,
  RDF_TYPE,
  XSD_BOOLEAN,
  XSD_INTEGER,
} from '../shacl/shacl-terms';

type ItemFactory = (item: string) => NamedNode | BlankNode | Literal;

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

  literalInt(subject: string, predicate: string, value: number, isBlankSubject = false): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value.toString(), DataFactory.namedNode(XSD_INTEGER))
    );
    return this;
  }

  literalBool(subject: string, predicate: string, value: boolean, isBlankSubject = false): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value.toString(), DataFactory.namedNode(XSD_BOOLEAN))
    );
    return this;
  }

  literalString(subject: string, predicate: string, value: string, isBlankSubject = false): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value)
    );
    return this;
  }

  literal(
    subject: string,
    predicate: string,
    value: string,
    datatype: string,
    isBlankSubject = false
  ): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
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
    const itemFactory: ItemFactory = itemsAreUris
      ? (item) => DataFactory.namedNode(item)
      : (item) => DataFactory.literal(item);
    return this.buildList(subject, predicate, items, isBlankSubject, itemFactory);
  }

  listOfBlanks(
    subject: string,
    predicate: string,
    blankIds: string[],
    isBlankSubject = false
  ): this {
    return this.buildList(subject, predicate, blankIds, isBlankSubject, (id) =>
      DataFactory.blankNode(id)
    );
  }

  build() {
    return this.store;
  }

  write(): Promise<string> {
    const writer = new Writer({ format: 'text/turtle', prefixes: this.prefixes });
    return this.writeToStore(writer);
  }

  async writeJsonLd(): Promise<string> {
    const nquads = await this.writeNQuads();
    const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
    const compacted = await jsonld.compact(doc, this.prefixes);
    return JSON.stringify(compacted, null, 2);
  }

  private subjectNode(subject: string, isBlank: boolean): NamedNode | BlankNode {
    return isBlank ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject);
  }

  private buildList(
    subject: string,
    predicate: string,
    items: string[],
    isBlankSubject: boolean,
    itemFactory: ItemFactory
  ): this {
    const subjectNode = this.subjectNode(subject, isBlankSubject);

    if (items.length === 0) {
      this.store.addQuad(
        subjectNode,
        DataFactory.namedNode(predicate),
        DataFactory.namedNode(RDF_NIL)
      );
      return this;
    }

    const listNodes = items.map((_, i) => DataFactory.blankNode(`list_${subject}_${String(i)}`));
    this.store.addQuad(subjectNode, DataFactory.namedNode(predicate), listNodes[0]);

    items.forEach((item, i) => {
      this.store.addQuad(listNodes[i], DataFactory.namedNode(RDF_FIRST), itemFactory(item));
      this.store.addQuad(
        listNodes[i],
        DataFactory.namedNode(RDF_REST),
        i < items.length - 1 ? listNodes[i + 1] : DataFactory.namedNode(RDF_NIL)
      );
    });

    return this;
  }

  private writeNQuads(): Promise<string> {
    const writer = new Writer({ format: 'application/n-quads' });
    return this.writeToStore(writer);
  }

  private writeToStore(writer: Writer<Quad>): Promise<string> {
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
