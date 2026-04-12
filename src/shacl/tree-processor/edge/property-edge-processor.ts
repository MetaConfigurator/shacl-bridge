import { SchemaEdge, SchemaNode } from '../../../tree/types';
import {
  SHACL_AND,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_NODE,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_XONE,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';

const LOGICAL_PREDICATES = new Map([
  ['allOf', SHACL_AND],
  ['anyOf', SHACL_OR],
  ['oneOf', SHACL_XONE],
]);

export class PropertyEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === 'properties');
  }

  process({ edges, subject, isBlank, schema }: EdgeContext): ChildNode[] {
    if (schema == null || subject == null || isBlank == null) return [];
    const required = new Set(schema.required ?? []);
    const byName = new Map(
      edges.filter((e): e is SchemaEdge & { key: string } => e.key != null).map((e) => [e.key, e])
    );

    const children: ChildNode[] = [];

    byName.forEach((edge, name) => {
      const child = this.processPropertyEdge(name, edge, subject, required, isBlank);
      if (child) children.push(child);
    });

    for (const req of required) {
      if (!byName.has(req)) {
        this.emitRequiredOnlyProperty(req, subject, isBlank);
      }
    }

    return children;
  }

  private emitRequiredOnlyProperty(name: string, subject: string, isBlank: boolean): void {
    const blankId = this.context.nextBlankId();
    this.context.store.linkBlank(subject, SHACL_PROPERTY, blankId, isBlank);
    this.context.store.blank(blankId, SHACL_PATH, this.context.buildPropertyUri(name));
    this.context.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
  }

  private processPropertyEdge(
    name: string,
    edge: SchemaEdge,
    subject: string,
    required: Set<string>,
    isBlank: boolean
  ): ChildNode | null {
    const blankId = this.context.nextBlankId();
    this.context.store.linkBlank(subject, SHACL_PROPERTY, blankId, isBlank);
    this.context.store.blank(blankId, SHACL_PATH, this.context.buildPropertyUri(name));

    if (required.has(name)) {
      this.context.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
    }

    if (edge.node.schema.type !== 'array') {
      this.context.store.literalInt(blankId, SHACL_MAX_COUNT, 1, true);
    }

    return this.processPropertySchema(blankId, edge.node);
  }

  private processPropertySchema(blankId: string, node: SchemaNode): ChildNode | null {
    const { schema } = node;

    if (schema.$ref) {
      this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(schema.$ref));
      return null;
    }

    if (schema.type === 'object' && schema.properties) {
      const nestedBlankId = this.context.nextBlankId();
      this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
      return { node, subject: nestedBlankId, isBlank: true };
    }

    if (schema.type === 'array' && schema.items) {
      this.shaclMapper.map(schema, blankId, true);
      const itemsEdge = node.children.find((e) => e.label === 'items');
      if (itemsEdge) {
        const itemsSchema = itemsEdge.node.schema;
        if (itemsSchema.$ref) {
          this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(itemsSchema.$ref));
        } else {
          const nestedBlankId = this.context.nextBlankId();
          this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
          this.shaclMapper.map(itemsSchema, nestedBlankId, true);
        }
      }
      return null;
    }

    for (const [label, predicate] of LOGICAL_PREDICATES) {
      const children = node.children.filter((e) => e.label === label);
      if (children.length > 0) {
        this.processPropertyLogicalOperator(blankId, children, predicate);
        return null;
      }
    }

    this.shaclMapper.map(schema, blankId, true);
    return null;
  }

  private processPropertyLogicalOperator(
    blankId: string,
    edges: SchemaEdge[],
    predicate: string
  ): void {
    if (edges.every((e) => !!e.node.schema.$ref)) {
      const refs = edges
        .map((e) => e.node.schema.$ref)
        .filter((ref): ref is string => ref !== undefined)
        .map((ref) => this.context.resolveRef(ref));
      this.context.store.list(blankId, predicate, refs, true, true);
      return;
    }

    const ids = edges.map((e) => {
      const innerBlank = this.context.nextBlankId();
      if (e.node.schema.$ref) {
        this.context.store.blank(
          innerBlank,
          SHACL_NODE,
          this.context.resolveRef(e.node.schema.$ref)
        );
      } else {
        this.shaclMapper.map(e.node.schema, innerBlank, true);
      }
      return innerBlank;
    });
    this.context.store.listOfBlanks(blankId, predicate, ids, true);
  }
}
