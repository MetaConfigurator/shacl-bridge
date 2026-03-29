import { SHACL_NODE, SHACL_NODE_SHAPE, SHACL_TARGET_CLASS } from '../shacl-terms';
import { ConstraintMapper } from './constraint-mapper';
import { WriterContext } from '../writer/writer-context';
import { SchemaEdge, SchemaNode } from '../../tree/types';
import {
  emitIfThenElse,
  groupByLabel,
  hasShapeContent,
  LABEL_HANDLERS,
  ShapeContext,
} from './shape-handlers';
import { emitProperties } from './property-emitter';

export class NodeProcessor {
  private readonly mapper: ConstraintMapper;
  private readonly processedDefs = new Set<string>();

  constructor(private readonly context: WriterContext) {
    this.mapper = new ConstraintMapper(context);
  }

  process(node: SchemaNode, subject: string, isBlank = false, targetClass?: string): void {
    const { schema, children } = node;
    const byLabel = groupByLabel(children);

    this.processDefs(byLabel.get('$defs') ?? []);

    if (!hasShapeContent(schema, children)) return;

    if (!isBlank) {
      this.context.store.shape(subject, SHACL_NODE_SHAPE);
      if (targetClass) this.context.store.triple(subject, SHACL_TARGET_CLASS, targetClass, false);
    }

    if (schema.$ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), false);
      return;
    }

    this.mapper.map(schema, subject, isBlank);

    const ctx: ShapeContext = {
      writer: this.context,
      mapper: this.mapper,
      process: this.process.bind(this),
      parentSchema: schema,
    };

    emitProperties(byLabel.get('properties') ?? [], subject, isBlank, ctx);

    for (const [label, handler] of LABEL_HANDLERS) {
      const edges = byLabel.get(label) ?? [];
      if (edges.length > 0) handler(edges, subject, isBlank, ctx);
    }

    if (byLabel.has('if')) {
      emitIfThenElse(byLabel, subject, isBlank, ctx);
    }
  }

  private processDefs(edges: SchemaEdge[]): void {
    for (const edge of edges) {
      if (!edge.key || this.processedDefs.has(edge.key)) continue;
      this.processedDefs.add(edge.key);
      const defUri = this.context.buildDefUri(edge.key);
      this.process(edge.node, defUri, false, defUri);
    }
  }
}
