import jsonld from 'jsonld';
import { BlankNode, DataFactory, Literal, NamedNode, Quad, Store, Writer } from 'n3';
import { RDF_FIRST, RDF_REST } from '../shacl/shacl-terms';

export class StoreWriter {
  constructor(
    private readonly store: Store,
    private readonly prefixes: Record<string, string> = {}
  ) {}

  write(): Promise<string> {
    const writer = new Writer({ format: 'text/turtle', prefixes: this.prefixes });
    return this.writeToStoreWithInlineLists(writer);
  }

  async writeJsonLd(): Promise<string> {
    const nquads = await this.writeNQuads();
    const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
    const compacted = await jsonld.compact(doc, this.prefixes);
    return JSON.stringify(compacted, null, 2);
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

  private writeToStoreWithInlineLists(writer: Writer<Quad>): Promise<string> {
    const { listHeads, listChainNodes } = this.detectLists();
    const inlinedBlankNodes = this.findInlinableBlankNodes(listChainNodes);

    return new Promise((resolve, reject) => {
      this.store.forEach((quad) => {
        if (quad.subject.termType === 'BlankNode' && listChainNodes.has(quad.subject.value)) {
          return;
        }
        if (quad.subject.termType === 'BlankNode' && inlinedBlankNodes.has(quad.subject.value)) {
          return;
        }
        if (quad.object.termType === 'BlankNode' && listHeads.has(quad.object.value)) {
          const items = (listHeads.get(quad.object.value) ?? []).map((item) =>
            this.buildInlineItem(item, listHeads, inlinedBlankNodes, writer)
          );
          writer.addQuad(
            quad.subject as NamedNode,
            quad.predicate as NamedNode,
            writer.list(items)
          );
          return;
        }
        if (quad.object.termType === 'BlankNode' && inlinedBlankNodes.has(quad.object.value)) {
          const blankNode = DataFactory.blankNode(quad.object.value);
          const inlineObj = this.buildInlineItem(blankNode, listHeads, inlinedBlankNodes, writer);
          writer.addQuad(quad.subject as NamedNode, quad.predicate as NamedNode, inlineObj);
          return;
        }
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

  private findInlinableBlankNodes(listChainNodes: Set<string>): Set<string> {
    const objectCounts = new Map<string, number>();
    this.store.forEach((quad) => {
      if (quad.object.termType === 'BlankNode' && !listChainNodes.has(quad.object.value)) {
        const id = quad.object.value;
        objectCounts.set(id, (objectCounts.get(id) ?? 0) + 1);
      }
    });

    const inlinable = new Set<string>();
    for (const [id, count] of objectCounts) {
      if (count === 1) {
        inlinable.add(id);
        this.collectNestedInlinableBlankNodes(DataFactory.blankNode(id), objectCounts, inlinable);
      }
    }
    return inlinable;
  }

  private collectNestedInlinableBlankNodes(
    blank: BlankNode,
    objectCounts: Map<string, number>,
    inlinable: Set<string>
  ): void {
    for (const quad of this.store.getQuads(blank, null, null, null)) {
      if (
        quad.object.termType === 'BlankNode' &&
        (objectCounts.get(quad.object.value) ?? 0) === 1
      ) {
        inlinable.add(quad.object.value);
        this.collectNestedInlinableBlankNodes(quad.object, objectCounts, inlinable);
      }
    }
  }

  private buildInlineItem(
    item: NamedNode | BlankNode | Literal,
    listHeads: Map<string, (NamedNode | BlankNode | Literal)[]>,
    inlinedBlankNodes: Set<string>,
    writer: Writer<Quad>
  ): NamedNode | BlankNode | Literal {
    if (item.termType !== 'BlankNode') {
      return item;
    }
    if (listHeads.has(item.value)) {
      const items = (listHeads.get(item.value) ?? []).map((i) =>
        this.buildInlineItem(i, listHeads, inlinedBlankNodes, writer)
      );
      return writer.list(items) as unknown as BlankNode;
    }
    if (!inlinedBlankNodes.has(item.value)) {
      return item;
    }
    const props = this.store.getQuads(item, null, null, null).map((q) => ({
      predicate: q.predicate as NamedNode,
      object: this.buildInlineItem(
        q.object as NamedNode | BlankNode | Literal,
        listHeads,
        inlinedBlankNodes,
        writer
      ),
    }));
    return writer.blank(props) as unknown as BlankNode;
  }

  private detectLists(): {
    listHeads: Map<string, (NamedNode | BlankNode | Literal)[]>;
    listChainNodes: Set<string>;
  } {
    const rdfFirst = DataFactory.namedNode(RDF_FIRST);
    const rdfRest = DataFactory.namedNode(RDF_REST);

    const restObjects = new Set<string>();
    this.store.forEach((quad) => {
      if (quad.predicate.value === RDF_REST && quad.object.termType === 'BlankNode') {
        restObjects.add(quad.object.value);
      }
    });

    const listHeads = new Map<string, (NamedNode | BlankNode | Literal)[]>();
    this.store.forEach((quad) => {
      if (
        quad.object.termType === 'BlankNode' &&
        quad.predicate.value !== RDF_REST &&
        !restObjects.has(quad.object.value) &&
        this.store.countQuads(quad.object, rdfFirst, null, null) > 0
      ) {
        const items: (NamedNode | BlankNode | Literal)[] = [];
        let current = quad.object as BlankNode | NamedNode;
        while (current.termType === 'BlankNode') {
          const [firstQuad] = this.store.getQuads(current, rdfFirst, null, null);
          items.push(firstQuad.object as NamedNode | BlankNode | Literal);
          const [restQuad] = this.store.getQuads(current, rdfRest, null, null);
          current = restQuad.object as BlankNode | NamedNode;
        }
        listHeads.set(quad.object.value, items);
      }
    });

    const listChainNodes = new Set<string>();
    for (const headId of listHeads.keys()) {
      let current: BlankNode | NamedNode = DataFactory.blankNode(headId);
      while (current.termType === 'BlankNode') {
        listChainNodes.add(current.value);
        const [restQuad] = this.store.getQuads(current, rdfRest, null, null);
        current = restQuad.object as BlankNode | NamedNode;
      }
    }

    return { listHeads, listChainNodes };
  }
}
