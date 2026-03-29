import { SchemaEdge, SchemaNode } from '../../tree/types';
import {
  SHACL_AND,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_NODE,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_XONE,
} from '../shacl-terms';
import { ShapeContext } from './shape-handlers';

const LOGICAL_PREDICATES = new Map([
  ['oneOf', SHACL_XONE],
  ['anyOf', SHACL_OR],
  ['allOf', SHACL_AND],
]);

export function emitProperties(
  edges: SchemaEdge[],
  subject: string,
  isBlank: boolean,
  ctx: ShapeContext
): void {
  const required = new Set(ctx.parentSchema.required ?? []);
  const byName = new Map(
    edges.filter((e): e is SchemaEdge & { key: string } => e.key != null).map((e) => [e.key, e])
  );

  byName.forEach((edge, name) => {
    emitPropertyEdge(name, edge, subject, isBlank, required, ctx);
  });

  [...required]
    .filter((req) => !byName.has(req))
    .forEach((req) => {
      emitRequiredOnlyProperty(req, subject, isBlank, ctx);
    });
}

function emitRequiredOnlyProperty(
  name: string,
  subject: string,
  isBlank: boolean,
  ctx: ShapeContext
): void {
  const blankId = ctx.writer.nextBlankId();
  if (isBlank) ctx.writer.store.bothBlank(subject, SHACL_PROPERTY, blankId);
  else ctx.writer.store.triple(subject, SHACL_PROPERTY, blankId, true);
  ctx.writer.store.blank(blankId, SHACL_PATH, ctx.writer.buildPropertyUri(name));
  ctx.writer.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
}

function emitPropertyEdge(
  name: string,
  edge: SchemaEdge,
  subject: string,
  isBlank: boolean,
  required: Set<string>,
  ctx: ShapeContext
): void {
  const blankId = ctx.writer.nextBlankId();
  if (isBlank) ctx.writer.store.bothBlank(subject, SHACL_PROPERTY, blankId);
  else ctx.writer.store.triple(subject, SHACL_PROPERTY, blankId, true);
  ctx.writer.store.blank(blankId, SHACL_PATH, ctx.writer.buildPropertyUri(name));

  if (required.has(name)) {
    ctx.writer.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
  }

  if (edge.node.schema.type !== 'array') {
    ctx.writer.store.literalInt(blankId, SHACL_MAX_COUNT, 1, true);
  }

  emitPropertySchema(blankId, edge.node, ctx);
}

function emitPropertySchema(blankId: string, node: SchemaNode, ctx: ShapeContext): void {
  const { schema } = node;

  if (schema.$ref) {
    ctx.writer.store.blank(blankId, SHACL_NODE, ctx.writer.resolveRef(schema.$ref));
    return;
  }

  if (schema.type === 'object' && schema.properties) {
    const nestedBlankId = ctx.writer.nextBlankId();
    ctx.writer.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
    ctx.process(node, nestedBlankId, true);
    return;
  }

  if (schema.type === 'array' && schema.items) {
    ctx.mapper.map(schema, blankId, true);
    const itemsEdge = node.children.find((e) => e.label === 'items');
    if (itemsEdge) {
      const itemsSchema = itemsEdge.node.schema;
      if (itemsSchema.$ref) {
        ctx.writer.store.blank(blankId, SHACL_NODE, ctx.writer.resolveRef(itemsSchema.$ref));
      } else {
        const nestedBlankId = ctx.writer.nextBlankId();
        ctx.writer.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
        ctx.mapper.map(itemsSchema, nestedBlankId, true);
      }
    }
    return;
  }

  for (const [label, predicate] of LOGICAL_PREDICATES) {
    const children = node.children.filter((e) => e.label === label);
    if (children.length > 0) {
      emitPropertyLogicalOperator(blankId, children, predicate, ctx);
      return;
    }
  }

  ctx.mapper.map(schema, blankId, true);
}

function emitPropertyLogicalOperator(
  blankId: string,
  edges: SchemaEdge[],
  predicate: string,
  ctx: ShapeContext
): void {
  if (edges.every((e) => !!e.node.schema.$ref)) {
    const refs = edges
      .map((e) => e.node.schema.$ref)
      .filter((ref): ref is string => ref !== undefined)
      .map((ref) => ctx.writer.resolveRef(ref));
    ctx.writer.store.list(blankId, predicate, refs, true, true);
    return;
  }

  const ids = edges.map((e) => {
    const innerBlank = ctx.writer.nextBlankId();
    if (e.node.schema.$ref) {
      ctx.writer.store.blank(innerBlank, SHACL_NODE, ctx.writer.resolveRef(e.node.schema.$ref));
    } else {
      ctx.mapper.map(e.node.schema, innerBlank, true);
    }
    return innerBlank;
  });
  ctx.writer.store.listOfBlanks(blankId, predicate, ids, true);
}
