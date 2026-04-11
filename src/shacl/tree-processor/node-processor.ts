import { SchemaEdge, SchemaNode } from '../../tree/types';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import {
  SHACL_AND,
  SHACL_NODE,
  SHACL_NODE_SHAPE,
  SHACL_OR,
  SHACL_TARGET_CLASS,
  SHACL_XONE,
} from '../shacl-terms';
import {
  JSON_SCHEMA_METADATA_KEYS,
  JSON_SCHEMA_SHACL_EDGE_LABELS,
  JSON_SCHEMA_UNHANDLED_KEYS,
} from '../../json-schema/json-schema-terms';
import { ShaclMapper } from './mapper/shacl-mapper';
import { WriterContext } from '../writer/writer-context';
import { ContainsEdgeProcessor } from './edge/contains-edge-processor';
import { DefsEdgeProcessor } from './edge/defs-edge-processor';
import { EdgeProcessor } from './edge/edge-processor';
import { EdgeResolver } from './edge/edge-resolver';
import { IfThenElseEdgeProcessor } from './edge/if-then-else-edge-processor';
import { ItemsEdgeProcessor } from './edge/items-edge-processor';
import { LogicalEdgeProcessor } from './edge/logical-edge-processor';
import { NotEdgeProcessor } from './edge/not-edge-processor';
import { PropertyEdgeProcessor } from './edge/property-edge-processor';

export class NodeProcessor {
  private readonly shaclMapper: ShaclMapper;
  private readonly propertyProcessor: PropertyEdgeProcessor;
  private readonly defsProcessor: DefsEdgeProcessor;
  private readonly edgeProcessors: Partial<Record<string, EdgeProcessor>>;

  constructor(private readonly context: WriterContext) {
    this.shaclMapper = new ShaclMapper(context);
    const processFn = (
      node: SchemaNode,
      subject: string,
      isBlank?: boolean,
      targetClass?: string
    ) => {
      this.process(node, subject, isBlank, targetClass);
    };
    const resolver = new EdgeResolver(context, processFn);

    this.propertyProcessor = new PropertyEdgeProcessor(context, this.shaclMapper, processFn);
    this.defsProcessor = new DefsEdgeProcessor(context, processFn);
    this.edgeProcessors = {
      allOf: new LogicalEdgeProcessor(context, resolver, SHACL_AND),
      anyOf: new LogicalEdgeProcessor(context, resolver, SHACL_OR),
      oneOf: new LogicalEdgeProcessor(context, resolver, SHACL_XONE),
      not: new NotEdgeProcessor(context, resolver),
      if: new IfThenElseEdgeProcessor(context, resolver),
      items: new ItemsEdgeProcessor(context, this.shaclMapper),
      contains: new ContainsEdgeProcessor(context, this.shaclMapper),
    };
  }

  process(node: SchemaNode, subject: string, isBlank = false, targetClass?: string): void {
    const { schema, children } = node;

    this.defsProcessor.process(children.filter((e) => e.label === '$defs'));

    if (!this.hasShapeContent(schema, children)) return;

    if (!isBlank) {
      this.context.store.shape(subject, SHACL_NODE_SHAPE);
      if (targetClass) {
        this.context.store.triple(subject, SHACL_TARGET_CLASS, targetClass, false);
      }
    }

    if (schema.$ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), false);
      return;
    }

    this.shaclMapper.map(schema, subject, isBlank);
    this.processEdges(children, subject, schema, isBlank);
  }

  private processEdges(
    edges: SchemaEdge[],
    subject: string,
    schema: JsonSchemaObjectType,
    isBlank: boolean
  ): void {
    const required = new Set(schema.required ?? []);
    this.propertyProcessor.process(
      edges.filter((e) => e.label === 'properties'),
      required,
      subject,
      isBlank
    );

    const grouped = edges
      .filter((e) => e.label !== 'properties' && e.label !== '$defs')
      .reduce((map: Map<string, SchemaEdge[]>, e: SchemaEdge) => {
        const list = map.get(e.label) ?? [];
        list.push(e);
        map.set(e.label, list);
        return map;
      }, new Map<string, SchemaEdge[]>());

    const ifEdges = [
      ...(grouped.get('if') ?? []),
      ...(grouped.get('then') ?? []),
      ...(grouped.get('else') ?? []),
    ];
    if (ifEdges.length > 0) {
      grouped.set('if', ifEdges);
      grouped.delete('then');
      grouped.delete('else');
    }

    for (const [label, labelEdges] of grouped) {
      const processor = this.edgeProcessors[label];
      if (processor) {
        processor.process(labelEdges, subject, isBlank, schema);
      }
    }
  }

  private hasShapeContent(schema: JsonSchemaObjectType, edges: SchemaEdge[]): boolean {
    const hasShapeEdge = edges.some((e) => JSON_SCHEMA_SHACL_EDGE_LABELS.has(e.label));
    const hasDefEdge = edges.some((e) => e.label === '$defs' || e.label === 'definitions');
    const hasConstraintKey = Object.keys(schema).some(
      (k) =>
        !JSON_SCHEMA_METADATA_KEYS.has(k) &&
        !JSON_SCHEMA_UNHANDLED_KEYS.has(k) &&
        !k.startsWith('x-')
    );
    return !(hasDefEdge && !hasShapeEdge && !hasConstraintKey);
  }
}
