import { match, P } from 'ts-pattern';
import { Edge, Graph, Node } from '../../graph/types';
import { JsonSchemaObjectType, JsonSchemaType } from '../../json-schema/meta/json-schema-type';
import {
  SHACL_AND,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_NODE,
  SHACL_NODE_SHAPE,
  SHACL_NOT,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
  SHACL_TARGET_CLASS,
  SHACL_XONE,
} from '../shacl-terms';
import { JSON_SCHEMA_UNHANDLED_KEYS } from '../../json-schema/json-schema-terms';
import { ConstraintMapper } from './constraint-mapper';
import { WriterContext } from '../writer/writer-context';

export class NodeProcessor {
  private readonly constraintMapper: ConstraintMapper;
  private readonly processedDefs = new Set<string>();

  constructor(
    private readonly context: WriterContext,
    private readonly graph: Graph
  ) {
    this.constraintMapper = new ConstraintMapper(context);
  }

  process(node: Node, subject: string, isBlank = false, targetClass?: string): void {
    if (typeof node.value !== 'object' || node.value === null) {
      return;
    }

    const schema = node.value as JsonSchemaObjectType;
    const edges = this.getEdgesFrom(node);

    if (!isBlank) {
      this.context.store.shape(subject, SHACL_NODE_SHAPE);
      if (targetClass) {
        this.context.store.triple(subject, SHACL_TARGET_CLASS, targetClass, false);
      }
    }

    this.processDefsEdges(edges);
    this.constraintMapper.map(schema, subject, isBlank);
    this.processEdges(edges, subject, schema, isBlank);
  }

  private getEdgesFrom(node: Node): Edge[] {
    return this.graph.edges.filter((e) => e.from.key === node.key);
  }

  private processDefsEdges(edges: Edge[]): void {
    const defsEdges = edges.filter((e) => e.label === '$defs');

    for (const edge of defsEdges) {
      const defName = edge.propertyKey;
      if (!defName || this.processedDefs.has(defName)) continue;

      this.processedDefs.add(defName);
      const defUri = this.context.buildDefUri(defName);
      // Target class is the same as the def URI (def name = class name)
      this.process(edge.to, defUri, false, defUri);
    }
  }

  private processEdges(
    edges: Edge[],
    subject: string,
    schema: JsonSchemaObjectType,
    isBlank = false
  ): void {
    const required = new Set(schema.required ?? []);
    const processedLabels = new Set<string>();

    for (const edge of edges) {
      match(edge.label)
        .with('properties', () => {
          this.processPropertyEdge(edge, subject, required, isBlank);
        })
        .with('$defs', () => {
          /* Already processed in processDefsEdges */
        })
        .with('allOf', () => {
          if (!processedLabels.has('allOf')) {
            this.processLogicalEdges(edges, 'allOf', SHACL_AND, subject, isBlank);
            processedLabels.add('allOf');
          }
        })
        .with('anyOf', () => {
          if (!processedLabels.has('anyOf')) {
            this.processLogicalEdges(edges, 'anyOf', SHACL_OR, subject, isBlank);
            processedLabels.add('anyOf');
          }
        })
        .with('oneOf', () => {
          if (!processedLabels.has('oneOf')) {
            this.processLogicalEdges(edges, 'oneOf', SHACL_XONE, subject, isBlank);
            processedLabels.add('oneOf');
          }
        })
        .with('not', () => {
          this.processNotEdge(edge, subject, isBlank);
        })
        .with('items', () => {
          this.processItemsEdge(edge, subject);
        })
        .with('contains', () => {
          this.processContainsEdge(edge, subject, schema);
        })
        .with('$ref', () => {
          this.processRefEdge(edge, subject);
        })
        .with('if', () => {
          if (!processedLabels.has('if')) {
            this.processIfThenElseEdges(edges, subject, isBlank);
            processedLabels.add('if');
          }
        })
        .with('then', 'else', () => {
          /* Handled by processIfThenElseEdges */
        });
    }
  }

  private processPropertyEdge(
    edge: Edge,
    subject: string,
    required: Set<string>,
    isBlank = false
  ): void {
    const propName = edge.propertyKey;
    if (!propName) return;

    const blankId = this.context.nextBlankId();
    if (isBlank) {
      this.context.store.bothBlank(subject, SHACL_PROPERTY, blankId);
    } else {
      this.context.store.triple(subject, SHACL_PROPERTY, blankId, true);
    }
    this.context.store.blank(blankId, SHACL_PATH, this.context.buildPropertyUri(propName));

    if (required.has(propName)) {
      this.context.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
    }

    const propSchema = edge.to.value as JsonSchemaObjectType;

    // Add sh:maxCount 1 for scalar (non-array) properties
    if (propSchema.type !== 'array') {
      this.context.store.literalInt(blankId, SHACL_MAX_COUNT, 1, true);
    }

    this.processPropertySchema(blankId, propSchema, edge);
  }

  private processPropertySchema(blankId: string, schema: JsonSchemaObjectType, edge: Edge): void {
    if (schema.$ref) {
      this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(schema.$ref));
      return;
    }

    if (schema.type === 'object' && schema.properties) {
      const nestedBlankId = this.context.nextBlankId();
      this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
      this.process(edge.to, nestedBlankId, true);
      return;
    }

    if (schema.type === 'array' && schema.items) {
      const itemsSchema = schema.items as JsonSchemaObjectType;
      if (itemsSchema.$ref) {
        this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(itemsSchema.$ref));
      } else {
        const nestedBlankId = this.context.nextBlankId();
        this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
        this.constraintMapper.map(itemsSchema, nestedBlankId, true);
      }
      return;
    }

    if (schema.oneOf) {
      this.processPropertyLogicalOperator(blankId, schema.oneOf, SHACL_XONE);
      return;
    }

    if (schema.anyOf) {
      this.processPropertyLogicalOperator(blankId, schema.anyOf, SHACL_OR);
      return;
    }

    if (schema.allOf) {
      this.processPropertyLogicalOperator(blankId, schema.allOf, SHACL_AND);
      return;
    }

    this.constraintMapper.map(schema, blankId, true);
  }

  private processPropertyLogicalOperator(
    blankId: string,
    schemas: JsonSchemaType[],
    predicate: string
  ): void {
    const refs = schemas
      .filter((s): s is JsonSchemaObjectType => typeof s === 'object')
      .map((s) => (s.$ref ? this.context.resolveRef(s.$ref) : null))
      .filter((ref): ref is string => ref !== null);

    if (refs.length > 0) {
      this.context.store.list(blankId, predicate, refs, true, true);
    }
  }

  private processLogicalEdges(
    edges: Edge[],
    label: string,
    predicate: string,
    subject: string,
    isBlank = false
  ): void {
    const logicalEdges = edges.filter((e) => e.label === label);
    if (logicalEdges.length === 0) return;

    const resolved = logicalEdges
      .map((e) => this.resolveEdgeToShapeId(e))
      .filter((r): r is { id: string; isRef: boolean } => r !== null);

    if (resolved.length > 0) {
      const ids = resolved.map((r) => r.id);
      if (resolved.every((r) => r.isRef)) {
        this.context.store.list(subject, predicate, ids, isBlank, true);
      } else {
        this.context.store.listOfBlanks(subject, predicate, ids, isBlank);
      }
    }
  }

  private processNotEdge(edge: Edge, subject: string, isBlank = false): void {
    const resolved = this.resolveEdgeToShapeId(edge);
    if (!resolved) return;

    if (isBlank) {
      if (resolved.isRef) this.context.store.blank(subject, SHACL_NOT, resolved.id);
      else this.context.store.bothBlank(subject, SHACL_NOT, resolved.id);
    } else {
      this.context.store.triple(subject, SHACL_NOT, resolved.id, !resolved.isRef);
    }
  }

  private processIfThenElseEdges(edges: Edge[], subject: string, isBlank = false): void {
    const ifEdge = edges.find((e) => e.label === 'if');
    const thenEdge = edges.find((e) => e.label === 'then');
    const elseEdge = edges.find((e) => e.label === 'else');

    if (!ifEdge || (!thenEdge && !elseEdge)) return;

    const ifResolved = this.resolveEdgeToShapeId(ifEdge);
    if (!ifResolved) return;

    const thenResolved = thenEdge ? this.resolveEdgeToShapeId(thenEdge) : null;
    const elseResolved = elseEdge ? this.resolveEdgeToShapeId(elseEdge) : null;

    match([thenResolved, elseResolved])
      .with([P.not(P.nullish), P.nullish], ([then_]) => {
        this.emitOrWithNot(ifResolved.id, then_.id, subject, isBlank);
      })
      .with([P.nullish, P.not(P.nullish)], ([, else_]) => {
        this.context.store.listOfBlanks(subject, SHACL_OR, [ifResolved.id, else_.id], isBlank);
      })
      .with([P.not(P.nullish), P.not(P.nullish)], ([then_, else_]) => {
        const notOrBlankId = this.context.nextBlankId();
        this.emitOrWithNot(ifResolved.id, then_.id, notOrBlankId, true);

        const ifOrBlankId = this.context.nextBlankId();
        this.context.store.listOfBlanks(ifOrBlankId, SHACL_OR, [ifResolved.id, else_.id], true);

        this.context.store.listOfBlanks(subject, SHACL_AND, [notOrBlankId, ifOrBlankId], isBlank);
      })
      .otherwise(() => {
        /* empty */
      });
  }

  private emitOrWithNot(
    notTargetId: string,
    thenId: string,
    subject: string,
    isBlank = false
  ): void {
    const notWrapperBlankId = this.context.nextBlankId();
    this.context.store.bothBlank(notWrapperBlankId, SHACL_NOT, notTargetId);
    this.context.store.listOfBlanks(subject, SHACL_OR, [notWrapperBlankId, thenId], isBlank);
  }

  private processItemsEdge(edge: Edge, subject: string): void {
    const schema = edge.to.value as JsonSchemaObjectType;
    if (schema.$ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), false);
    } else {
      const blankId = this.context.nextBlankId();
      this.context.store.triple(subject, SHACL_NODE, blankId, true);
      this.constraintMapper.map(schema, blankId, true);
    }
  }

  private processRefEdge(edge: Edge, subject: string): void {
    const refValue = edge.to.value;
    if (typeof refValue === 'string') {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(refValue), false);
    }
  }

  private resolveEdgeToShapeId(edge: Edge): { id: string; isRef: boolean } | null {
    const schema = edge.to.value as JsonSchemaObjectType;
    if (schema.$ref) {
      return { id: this.context.resolveRef(schema.$ref), isRef: true };
    }
    if (this.hasMappableContent(schema)) {
      const blankId = this.context.nextBlankId();
      this.process(edge.to, blankId, true);
      return { id: blankId, isRef: false };
    }
    return null;
  }

  private hasMappableContent(schema: JsonSchemaObjectType): boolean {
    return Object.keys(schema).some((k) => !JSON_SCHEMA_UNHANDLED_KEYS.has(k));
  }

  private processContainsEdge(
    edge: Edge,
    subject: string,
    parentSchema: JsonSchemaObjectType
  ): void {
    const schema = edge.to.value as JsonSchemaObjectType;
    const blankId = this.context.nextBlankId();

    this.context.store.triple(subject, SHACL_QUALIFIED_VALUE_SHAPE, blankId, true);
    this.constraintMapper.map(schema, blankId, true);

    const minContains = parentSchema.minContains ?? 1;
    this.context.store.literalInt(subject, SHACL_QUALIFIED_MIN_COUNT, minContains, false);

    if (parentSchema.maxContains !== undefined) {
      this.context.store.literalInt(
        subject,
        SHACL_QUALIFIED_MAX_COUNT,
        parentSchema.maxContains,
        false
      );
    }
  }
}
