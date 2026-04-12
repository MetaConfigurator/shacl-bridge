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
import { ChildNode, EdgeProcessor } from './edge/edge-processor';
import { ContainsEdgeProcessor } from './edge/contains-edge-processor';
import { DefsEdgeProcessor } from './edge/defs-edge-processor';
import { IfThenElseEdgeProcessor } from './edge/if-then-else-edge-processor';
import { ItemsEdgeProcessor } from './edge/items-edge-processor';
import { LogicalEdgeProcessor } from './edge/logical-edge-processor';
import { NotEdgeProcessor } from './edge/not-edge-processor';
import { PropertyEdgeProcessor } from './edge/property-edge-processor';

export class NodeProcessor {
  private readonly shaclMapper: ShaclMapper;
  private readonly defsProcessor: DefsEdgeProcessor;
  private readonly propertyProcessor: PropertyEdgeProcessor;
  private readonly edgeProcessors: EdgeProcessor[];

  constructor(private readonly context: WriterContext) {
    this.shaclMapper = new ShaclMapper(context);
    this.defsProcessor = new DefsEdgeProcessor(context);
    this.propertyProcessor = new PropertyEdgeProcessor(context, this.shaclMapper);
    this.edgeProcessors = [
      new LogicalEdgeProcessor(context, 'allOf', SHACL_AND),
      new LogicalEdgeProcessor(context, 'anyOf', SHACL_OR),
      new LogicalEdgeProcessor(context, 'oneOf', SHACL_XONE),
      new IfThenElseEdgeProcessor(context),
      new NotEdgeProcessor(context),
      new ItemsEdgeProcessor(context, this.shaclMapper),
      new ContainsEdgeProcessor(context, this.shaclMapper),
    ];
  }

  process(root: SchemaNode, subject: string, isBlank = false, targetClass?: string): void {
    const stack: ChildNode[] = [{ node: root, subject, isBlank, targetClass }];

    while (stack.length > 0) {
      const { node, subject, isBlank = false, targetClass } = stack.pop() ?? {};
      const { schema, children } = node ?? { schema: {}, children: [] };
      if (subject == null) continue;

      const defEdges = this.defsProcessor.filter(children);
      if (defEdges.length > 0) {
        stack.push(...this.defsProcessor.process({ edges: defEdges, subject, isBlank, schema }));
      }

      if (!this.hasShapeContent(schema, children)) continue;

      if (!isBlank) {
        this.context.store.shape(subject, SHACL_NODE_SHAPE);
        if (targetClass) {
          this.context.store.triple(subject, SHACL_TARGET_CLASS, targetClass, false);
        }
      }

      if (schema.$ref) {
        this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), false);
        continue;
      }

      this.shaclMapper.map(schema, subject, isBlank);

      for (const processor of this.edgeProcessors) {
        const edges = processor.filter(children);
        if (edges.length === 0) continue;
        const prepared = processor.prepare?.(edges) ?? edges;
        stack.push(...processor.process({ edges: prepared, subject, isBlank, schema }));
      }

      stack.push(
        ...this.propertyProcessor.process({
          edges: children.filter((e) => e.label === 'properties'),
          subject,
          isBlank,
          schema,
        })
      );
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
    return !hasDefEdge || hasShapeEdge || hasConstraintKey;
  }
}
