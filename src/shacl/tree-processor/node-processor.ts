import { match, P } from 'ts-pattern';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
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
import {
  JSON_SCHEMA_METADATA_KEYS,
  JSON_SCHEMA_SHACL_EDGE_LABELS,
  JSON_SCHEMA_UNHANDLED_KEYS,
} from '../../json-schema/json-schema-terms';
import { ConstraintMapper } from './constraint-mapper';
import { WriterContext } from '../writer/writer-context';
import { SchemaEdge, SchemaNode } from '../../tree/types';

export class NodeProcessor {
  private readonly constraintMapper: ConstraintMapper;
  private readonly processedDefs = new Set<string>();

  constructor(private readonly context: WriterContext) {
    this.constraintMapper = new ConstraintMapper(context);
  }

  process(node: SchemaNode, subject: string, isBlank = false, targetClass?: string): void {
    const { schema, children } = node;

    this.processDefsEdges(children);

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

    this.constraintMapper.map(schema, subject, isBlank);
    this.processEdges(children, subject, schema, isBlank);
  }

  private hasShapeContent(schema: JsonSchemaObjectType, children: SchemaEdge[]): boolean {
    const hasShapeEdge = children.some((e) => JSON_SCHEMA_SHACL_EDGE_LABELS.has(e.label));
    const hasDefEdge = children.some((e) => e.label === '$defs' || e.label === 'definitions');
    const hasConstraintKey = Object.keys(schema).some(
      (k) =>
        !JSON_SCHEMA_METADATA_KEYS.has(k) &&
        !JSON_SCHEMA_UNHANDLED_KEYS.has(k) &&
        !k.startsWith('x-')
    );
    return !(hasDefEdge && !hasShapeEdge && !hasConstraintKey);
  }

  private processDefsEdges(children: SchemaEdge[]): void {
    for (const edge of children.filter((e) => e.label === '$defs')) {
      const defName = edge.key;
      if (!defName || this.processedDefs.has(defName)) continue;
      this.processedDefs.add(defName);
      const defUri = this.context.buildDefUri(defName);
      this.process(edge.node, defUri, false, defUri);
    }
  }

  private processEdges(
    children: SchemaEdge[],
    subject: string,
    schema: JsonSchemaObjectType,
    isBlank = false
  ): void {
    const required = new Set(schema.required ?? []);
    const processedProperties = new Set<string>();
    const processedLabels = new Set<string>();

    for (const edge of children) {
      match(edge.label)
        .with('properties', () => {
          if (edge.key) processedProperties.add(edge.key);
          this.processPropertyEdge(edge, subject, required, isBlank);
        })
        .with('$defs', () => {
          /* Already processed in processDefsEdges */
        })
        .with('allOf', () => {
          if (!processedLabels.has('allOf')) {
            this.processLogicalEdges(children, 'allOf', SHACL_AND, subject, isBlank);
            processedLabels.add('allOf');
          }
        })
        .with('anyOf', () => {
          if (!processedLabels.has('anyOf')) {
            this.processLogicalEdges(children, 'anyOf', SHACL_OR, subject, isBlank);
            processedLabels.add('anyOf');
          }
        })
        .with('oneOf', () => {
          if (!processedLabels.has('oneOf')) {
            this.processLogicalEdges(children, 'oneOf', SHACL_XONE, subject, isBlank);
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
        .with('if', () => {
          if (!processedLabels.has('if')) {
            this.processIfThenElseEdges(children, subject, isBlank);
            processedLabels.add('if');
          }
        })
        .with('then', 'else', () => {
          /* Handled by processIfThenElseEdges */
        });
    }

    for (const req of required) {
      if (!processedProperties.has(req)) {
        const blankId = this.context.nextBlankId();
        if (isBlank) {
          this.context.store.bothBlank(subject, SHACL_PROPERTY, blankId);
        } else {
          this.context.store.triple(subject, SHACL_PROPERTY, blankId, true);
        }
        this.context.store.blank(blankId, SHACL_PATH, this.context.buildPropertyUri(req));
        this.context.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
      }
    }
  }

  private processPropertyEdge(
    edge: SchemaEdge,
    subject: string,
    required: Set<string>,
    isBlank = false
  ): void {
    const propName = edge.key;
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

    const propSchema = edge.node.schema;

    if (propSchema.type !== 'array') {
      this.context.store.literalInt(blankId, SHACL_MAX_COUNT, 1, true);
    }

    this.processPropertySchema(blankId, edge.node);
  }

  private processPropertySchema(blankId: string, node: SchemaNode): void {
    const schema = node.schema;

    if (schema.$ref) {
      this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(schema.$ref));
      return;
    }

    if (schema.type === 'object' && schema.properties) {
      const nestedBlankId = this.context.nextBlankId();
      this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
      this.process(node, nestedBlankId, true);
      return;
    }

    if (schema.type === 'array' && schema.items) {
      this.constraintMapper.map(schema, blankId, true);
      const itemsEdge = node.children.find((e) => e.label === 'items');
      if (itemsEdge) {
        const itemsSchema = itemsEdge.node.schema;
        if (itemsSchema.$ref) {
          this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(itemsSchema.$ref));
        } else {
          const nestedBlankId = this.context.nextBlankId();
          this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
          this.constraintMapper.map(itemsSchema, nestedBlankId, true);
        }
      }
      return;
    }

    const oneOfChildren = node.children.filter((e) => e.label === 'oneOf');
    if (oneOfChildren.length > 0) {
      this.processPropertyLogicalOperator(blankId, oneOfChildren, SHACL_XONE);
      return;
    }

    const anyOfChildren = node.children.filter((e) => e.label === 'anyOf');
    if (anyOfChildren.length > 0) {
      this.processPropertyLogicalOperator(blankId, anyOfChildren, SHACL_OR);
      return;
    }

    const allOfChildren = node.children.filter((e) => e.label === 'allOf');
    if (allOfChildren.length > 0) {
      this.processPropertyLogicalOperator(blankId, allOfChildren, SHACL_AND);
      return;
    }

    this.constraintMapper.map(schema, blankId, true);
  }

  private processPropertyLogicalOperator(
    blankId: string,
    edges: SchemaEdge[],
    predicate: string
  ): void {
    if (edges.length === 0) return;

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
        this.constraintMapper.map(e.node.schema, innerBlank, true);
      }
      return innerBlank;
    });
    this.context.store.listOfBlanks(blankId, predicate, ids, true);
  }

  private processLogicalEdges(
    children: SchemaEdge[],
    label: string,
    predicate: string,
    subject: string,
    isBlank = false
  ): void {
    const logicalEdges = children.filter((e) => e.label === label);
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

  private processNotEdge(edge: SchemaEdge, subject: string, isBlank = false): void {
    const resolved = this.resolveEdgeToShapeId(edge);
    if (!resolved) return;

    if (isBlank) {
      if (resolved.isRef) this.context.store.blank(subject, SHACL_NOT, resolved.id);
      else this.context.store.bothBlank(subject, SHACL_NOT, resolved.id);
    } else {
      this.context.store.triple(subject, SHACL_NOT, resolved.id, !resolved.isRef);
    }
  }

  private processIfThenElseEdges(children: SchemaEdge[], subject: string, isBlank = false): void {
    const ifEdge = children.find((e) => e.label === 'if');
    const thenEdge = children.find((e) => e.label === 'then');
    const elseEdge = children.find((e) => e.label === 'else');

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

  private processItemsEdge(edge: SchemaEdge, subject: string): void {
    const schema = edge.node.schema;
    if (schema.$ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), false);
    } else {
      const blankId = this.context.nextBlankId();
      this.context.store.triple(subject, SHACL_NODE, blankId, true);
      this.constraintMapper.map(schema, blankId, true);
    }
  }

  private resolveEdgeToShapeId(edge: SchemaEdge): { id: string; isRef: boolean } | null {
    const schema = edge.node.schema;
    if (schema.$ref) {
      return { id: this.context.resolveRef(schema.$ref), isRef: true };
    }
    if (this.hasMappableContent(schema)) {
      const blankId = this.context.nextBlankId();
      this.process(edge.node, blankId, true);
      return { id: blankId, isRef: false };
    }
    return null;
  }

  private hasMappableContent(schema: JsonSchemaObjectType): boolean {
    return Object.keys(schema).some((k) => !JSON_SCHEMA_UNHANDLED_KEYS.has(k));
  }

  private processContainsEdge(
    edge: SchemaEdge,
    subject: string,
    parentSchema: JsonSchemaObjectType
  ): void {
    const schema = edge.node.schema;
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
