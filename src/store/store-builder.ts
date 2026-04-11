import { match, P } from 'ts-pattern';
import { BlankNode, DataFactory, Literal, NamedNode, Store } from 'n3';
import {
  RDF_FIRST,
  RDF_JSON,
  RDF_NIL,
  RDF_REST,
  RDF_TYPE,
  XSD_BOOLEAN,
  XSD_DECIMAL,
  XSD_INTEGER,
} from '../shacl/shacl-terms';
import { StoreWriter } from './store-writer';

type ItemFactory = (item: unknown) => NamedNode | BlankNode | Literal;

export function jsValueToLiteral(value: unknown): Literal {
  return match(value)
    .with(P.number, (n) =>
      DataFactory.literal(
        n.toString(),
        DataFactory.namedNode(Number.isInteger(n) ? XSD_INTEGER : XSD_DECIMAL)
      )
    )
    .with(P.boolean, (b) => DataFactory.literal(b.toString(), DataFactory.namedNode(XSD_BOOLEAN)))
    .with(P.string, (s) => DataFactory.literal(s))
    .otherwise((v) => DataFactory.literal(JSON.stringify(v), DataFactory.namedNode(RDF_JSON)));
}

export class StoreBuilder {
  private store = new Store();
  private prefixes: Record<string, string> = {};
  private listCallCounts = new Map<string, number>();

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

  linkBlank(subject: string, predicate: string, blankId: string, isBlankSubject = false): this {
    return isBlankSubject
      ? this.bothBlank(subject, predicate, blankId)
      : this.triple(subject, predicate, blankId, true);
  }

  linkNamed(subject: string, predicate: string, uri: string, isBlankSubject = false): this {
    return isBlankSubject
      ? this.blank(subject, predicate, uri)
      : this.triple(subject, predicate, uri, false);
  }

  literalInt(subject: string, predicate: string, value: number, isBlankSubject = false): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value.toString(), DataFactory.namedNode(XSD_INTEGER))
    );
    return this;
  }

  literalNumber(subject: string, predicate: string, value: number, isBlankSubject = false): this {
    return this.literalValue(subject, predicate, value, isBlankSubject);
  }

  literalBool(subject: string, predicate: string, value: boolean, isBlankSubject = false): this {
    return this.literalValue(subject, predicate, value, isBlankSubject);
  }

  literalString(subject: string, predicate: string, value: string, isBlankSubject = false): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
      DataFactory.namedNode(predicate),
      DataFactory.literal(value)
    );
    return this;
  }

  literalValue(subject: string, predicate: string, value: unknown, isBlankSubject = false): this {
    this.store.addQuad(
      this.subjectNode(subject, isBlankSubject),
      DataFactory.namedNode(predicate),
      jsValueToLiteral(value)
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
      ? (item) => DataFactory.namedNode(item as string)
      : (item) => DataFactory.literal(item as string);
    return this.buildList(subject, predicate, items, isBlankSubject, itemFactory);
  }

  listOfBlanks(
    subject: string,
    predicate: string,
    blankIds: string[],
    isBlankSubject = false
  ): this {
    return this.buildList(subject, predicate, blankIds, isBlankSubject, (id) =>
      DataFactory.blankNode(id as string)
    );
  }

  listOfValues(subject: string, predicate: string, items: unknown[], isBlankSubject = false): this {
    return this.buildList(subject, predicate, items, isBlankSubject, (item) =>
      jsValueToLiteral(item as string | number | boolean)
    );
  }

  build(): Store {
    return this.store;
  }

  toWriter(): StoreWriter {
    return new StoreWriter(this.store, this.prefixes);
  }

  write(): Promise<string> {
    return this.toWriter().write();
  }

  writeJsonLd(): Promise<string> {
    return this.toWriter().writeJsonLd();
  }

  private subjectNode(subject: string, isBlank: boolean): NamedNode | BlankNode {
    return isBlank ? DataFactory.blankNode(subject) : DataFactory.namedNode(subject);
  }

  private buildList(
    subject: string,
    predicate: string,
    items: unknown[],
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

    const safeSubject = subject.replace(/[^a-zA-Z0-9_]/g, '_');
    const safePredicate = predicate.replace(/[^a-zA-Z0-9_]/g, '_');
    const callKey = `${safeSubject}_${safePredicate}`;
    const callIndex = this.listCallCounts.get(callKey) ?? 0;
    this.listCallCounts.set(callKey, callIndex + 1);
    const listNodes = items.map((_, i) =>
      DataFactory.blankNode(
        `list_${safeSubject}_${safePredicate}_${String(callIndex)}_${String(i)}`
      )
    );
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
}
