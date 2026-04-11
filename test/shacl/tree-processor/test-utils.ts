import { DataFactory, Store, Term } from 'n3';
import { GraphBuilder } from '../../../src/graph/graph-builder';
import { Edge, Node } from '../../../src/graph/types';
import { JsonSchemaObjectType } from '../../../src/json-schema/meta/json-schema-type';
import { NodeProcessor } from '../../../src/shacl/tree-processor/node-processor';
import { WriterContext } from '../../../src/shacl/writer/writer-context';
import { RDF_FIRST, RDF_NIL, RDF_REST } from '../../../src/shacl/shacl-terms';

export const EX = 'http://example.org/';

export function buildStore(subject: string, fn: (context: WriterContext) => void): Store {
  const context = new WriterContext({ $id: subject });
  fn(context);
  return context.store.build();
}

export function makeNode(value: unknown): Node {
  return { key: 'node', value: value as Node['value'] };
}

export function makeEdge(toValue: unknown, label: string, fromValue: unknown = {}): Edge {
  return { from: makeNode(fromValue), to: makeNode(toValue), label };
}

export function processSchema(schema: JsonSchemaObjectType): Store {
  const context = new WriterContext(schema);
  const graph = new GraphBuilder(schema).build();
  const processor = new NodeProcessor(context, graph);
  const rootNode = graph.nodes.find((n) => n.key === 'root');
  if (rootNode) processor.process(rootNode, context.shapeUri);
  return context.store.build();
}

export function getObject(store: Store, subject: string, predicate: string): string | undefined {
  return store.getObjects(DataFactory.namedNode(subject), DataFactory.namedNode(predicate), null)[0]
    ?.value;
}

export function getObjectTerms(store: Store, subject: string, predicate: string): Term[] {
  return store.getObjects(DataFactory.namedNode(subject), DataFactory.namedNode(predicate), null);
}

export function getBlankObject(
  store: Store,
  blank: Term | string,
  predicate: string
): string | undefined {
  const subject = typeof blank === 'string' ? DataFactory.blankNode(blank) : blank;
  return store.getObjects(subject, DataFactory.namedNode(predicate), null)[0]?.value;
}

export function getListItems(store: Store, listHead: Term): string[] {
  const items: string[] = [];
  let current = listHead;
  while (current.value !== RDF_NIL) {
    const first = store.getObjects(current, DataFactory.namedNode(RDF_FIRST), null)[0];
    items.push(first.value);
    current = store.getObjects(current, DataFactory.namedNode(RDF_REST), null)[0];
  }
  return items;
}
