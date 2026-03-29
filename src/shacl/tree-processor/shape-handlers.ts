import { SchemaEdge, SchemaNode } from '../../tree/types';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import { WriterContext } from '../writer/writer-context';
import { ConstraintMapper } from './constraint-mapper';
import {
  JSON_SCHEMA_METADATA_KEYS,
  JSON_SCHEMA_SHACL_EDGE_LABELS,
  JSON_SCHEMA_UNHANDLED_KEYS,
} from '../../json-schema/json-schema-terms';
import {
  SHACL_AND,
  SHACL_NODE,
  SHACL_NOT,
  SHACL_OR,
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
  SHACL_XONE,
} from '../shacl-terms';

export interface ShapeContext {
  writer: WriterContext;
  mapper: ConstraintMapper;
  process: (node: SchemaNode, subject: string, isBlank?: boolean, targetClass?: string) => void;
  parentSchema: JsonSchemaObjectType;
}

type Handler = (edges: SchemaEdge[], subject: string, isBlank: boolean, ctx: ShapeContext) => void;

export function groupByLabel(children: SchemaEdge[]): Map<string, SchemaEdge[]> {
  const map = new Map<string, SchemaEdge[]>();
  for (const edge of children) {
    const group = map.get(edge.label);
    if (group) group.push(edge);
    else map.set(edge.label, [edge]);
  }
  return map;
}

export function hasShapeContent(schema: JsonSchemaObjectType, children: SchemaEdge[]): boolean {
  const hasShapeEdge = children.some((e) => JSON_SCHEMA_SHACL_EDGE_LABELS.has(e.label));
  const hasDefEdge = children.some((e) => e.label === '$defs' || e.label === 'definitions');
  const hasConstraintKey = Object.keys(schema).some(
    (k) =>
      !JSON_SCHEMA_METADATA_KEYS.has(k) && !JSON_SCHEMA_UNHANDLED_KEYS.has(k) && !k.startsWith('x-')
  );
  return !(hasDefEdge && !hasShapeEdge && !hasConstraintKey);
}

function resolveEdgeToShapeId(
  edge: SchemaEdge,
  ctx: ShapeContext
): { id: string; isRef: boolean } | null {
  const { schema } = edge.node;
  if (schema.$ref) {
    return { id: ctx.writer.resolveRef(schema.$ref), isRef: true };
  }
  if (Object.keys(schema).some((k) => !JSON_SCHEMA_UNHANDLED_KEYS.has(k))) {
    const blankId = ctx.writer.nextBlankId();
    ctx.process(edge.node, blankId, true);
    return { id: blankId, isRef: false };
  }
  return null;
}

function emitLogical(
  edges: SchemaEdge[],
  predicate: string,
  subject: string,
  isBlank: boolean,
  ctx: ShapeContext
): void {
  const resolved = edges
    .map((e) => resolveEdgeToShapeId(e, ctx))
    .filter((r): r is { id: string; isRef: boolean } => r !== null);

  if (resolved.length === 0) return;

  const ids = resolved.map((r) => r.id);
  if (resolved.every((r) => r.isRef)) {
    ctx.writer.store.list(subject, predicate, ids, isBlank, true);
  } else {
    ctx.writer.store.listOfBlanks(subject, predicate, ids, isBlank);
  }
}

function emitNot([edge]: SchemaEdge[], subject: string, isBlank: boolean, ctx: ShapeContext): void {
  if (!edge) return;
  const resolved = resolveEdgeToShapeId(edge, ctx);
  if (!resolved) return;

  if (isBlank) {
    if (resolved.isRef) ctx.writer.store.blank(subject, SHACL_NOT, resolved.id);
    else ctx.writer.store.bothBlank(subject, SHACL_NOT, resolved.id);
  } else {
    ctx.writer.store.triple(subject, SHACL_NOT, resolved.id, !resolved.isRef);
  }
}

function emitItems(
  [edge]: SchemaEdge[],
  subject: string,
  _isBlank: boolean,
  ctx: ShapeContext
): void {
  if (!edge) return;
  const { schema } = edge.node;
  if (schema.$ref) {
    ctx.writer.store.triple(subject, SHACL_NODE, ctx.writer.resolveRef(schema.$ref), false);
  } else {
    const blankId = ctx.writer.nextBlankId();
    ctx.writer.store.triple(subject, SHACL_NODE, blankId, true);
    ctx.mapper.map(schema, blankId, true);
  }
}

function emitContains(
  [edge]: SchemaEdge[],
  subject: string,
  _isBlank: boolean,
  ctx: ShapeContext
): void {
  if (!edge) return;
  const blankId = ctx.writer.nextBlankId();
  ctx.writer.store.triple(subject, SHACL_QUALIFIED_VALUE_SHAPE, blankId, true);
  ctx.mapper.map(edge.node.schema, blankId, true);

  const minContains = ctx.parentSchema.minContains ?? 1;
  ctx.writer.store.literalInt(subject, SHACL_QUALIFIED_MIN_COUNT, minContains, false);

  if (ctx.parentSchema.maxContains !== undefined) {
    ctx.writer.store.literalInt(
      subject,
      SHACL_QUALIFIED_MAX_COUNT,
      ctx.parentSchema.maxContains,
      false
    );
  }
}

function emitOrWithNot(
  notTargetId: string,
  thenId: string,
  subject: string,
  isBlank: boolean,
  ctx: ShapeContext
): void {
  const notWrapperBlankId = ctx.writer.nextBlankId();
  ctx.writer.store.bothBlank(notWrapperBlankId, SHACL_NOT, notTargetId);
  ctx.writer.store.listOfBlanks(subject, SHACL_OR, [notWrapperBlankId, thenId], isBlank);
}

export function emitIfThenElse(
  byLabel: Map<string, SchemaEdge[]>,
  subject: string,
  isBlank: boolean,
  ctx: ShapeContext
): void {
  const ifEdge = byLabel.get('if')?.[0];
  const thenEdge = byLabel.get('then')?.[0];
  const elseEdge = byLabel.get('else')?.[0];

  if (!ifEdge || (!thenEdge && !elseEdge)) return;

  const ifResolved = resolveEdgeToShapeId(ifEdge, ctx);
  if (!ifResolved) return;

  const thenResolved = thenEdge ? resolveEdgeToShapeId(thenEdge, ctx) : null;
  const elseResolved = elseEdge ? resolveEdgeToShapeId(elseEdge, ctx) : null;

  if (thenResolved && !elseResolved) {
    emitOrWithNot(ifResolved.id, thenResolved.id, subject, isBlank, ctx);
  } else if (!thenResolved && elseResolved) {
    ctx.writer.store.listOfBlanks(subject, SHACL_OR, [ifResolved.id, elseResolved.id], isBlank);
  } else if (thenResolved && elseResolved) {
    const notOrBlankId = ctx.writer.nextBlankId();
    emitOrWithNot(ifResolved.id, thenResolved.id, notOrBlankId, true, ctx);

    const ifOrBlankId = ctx.writer.nextBlankId();
    ctx.writer.store.listOfBlanks(ifOrBlankId, SHACL_OR, [ifResolved.id, elseResolved.id], true);

    ctx.writer.store.listOfBlanks(subject, SHACL_AND, [notOrBlankId, ifOrBlankId], isBlank);
  }
}

export const LABEL_HANDLERS = new Map<string, Handler>([
  [
    'allOf',
    (edges, s, b, ctx) => {
      emitLogical(edges, SHACL_AND, s, b, ctx);
    },
  ],
  [
    'anyOf',
    (edges, s, b, ctx) => {
      emitLogical(edges, SHACL_OR, s, b, ctx);
    },
  ],
  [
    'oneOf',
    (edges, s, b, ctx) => {
      emitLogical(edges, SHACL_XONE, s, b, ctx);
    },
  ],
  [
    'not',
    (edges, s, b, ctx) => {
      emitNot(edges, s, b, ctx);
    },
  ],
  [
    'items',
    (edges, s, b, ctx) => {
      emitItems(edges, s, b, ctx);
    },
  ],
  [
    'contains',
    (edges, s, b, ctx) => {
      emitContains(edges, s, b, ctx);
    },
  ],
]);
