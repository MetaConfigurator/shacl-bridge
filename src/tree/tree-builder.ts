import {
  SCHEMA_ARRAY_KEYWORDS,
  SCHEMA_RECORD_KEYWORDS,
  SCHEMA_VALUED_KEYWORDS,
} from '../json-schema/keywords';
import { JsonSchemaObjectType, JsonSchemaType } from '../json-schema/meta/json-schema-type';
import { SchemaEdge, SchemaNode } from './types';

/** Resolves a child JSON Schema value to a {@link SchemaNode}, or `null` for boolean schemas. */
type BuildChild = (schema: JsonSchemaType) => SchemaNode | null;

/** Produces zero or more {@link SchemaEdge}s from a keyword and its raw value. */
type EdgeBuilder = (prop: string, value: unknown, bc: BuildChild) => SchemaEdge[];

/**
 * Builds one edge per named entry in a record-valued keyword (e.g. `properties`, `$defs`).
 * Each entry's key becomes {@link SchemaEdge.key}.
 */
const buildRecordEdges: EdgeBuilder = (prop, value, bc) =>
  Object.entries(value as Record<string, JsonSchemaType>).flatMap(([key, child]) => {
    const node = bc(child);
    return node ? [{ label: prop, key, node }] : [];
  });

/**
 * Builds one edge per item in an array-valued keyword (e.g. `anyOf`, `allOf`, `oneOf`).
 * Each item's position becomes {@link SchemaEdge.index}.
 * Boolean schemas are preserved as {@link SchemaNode} with {@link SchemaNode.booleanSchema} set.
 */
const buildArrayEdges: EdgeBuilder = (prop, value, bc) =>
  (value as JsonSchemaType[]).flatMap((child, index) => {
    const node = bc(child);
    return node ? [{ label: prop, index, node }] : [];
  });

/**
 * Builds a single edge for a schema-valued keyword (e.g. `items`, `not`, `if`, `then`, `else`).
 * Returns an empty array if the value is a boolean schema.
 */
const buildValuedEdge: EdgeBuilder = (prop, value, bc) => {
  const node = bc(value as JsonSchemaType);
  return node ? [{ label: prop, node }] : [];
};

/**
 * Flat lookup map from every known schema keyword to its {@link EdgeBuilder}.
 * Built once at module load by expanding the three keyword sets.
 */
const KEYWORD_BUILDERS = new Map<string, EdgeBuilder>([
  ...Array.from(SCHEMA_RECORD_KEYWORDS, (k) => [k, buildRecordEdges] as const),
  ...Array.from(SCHEMA_ARRAY_KEYWORDS, (k) => [k, buildArrayEdges] as const),
  ...Array.from(SCHEMA_VALUED_KEYWORDS, (k) => [k, buildValuedEdge] as const),
]);

/** Converts a JSON Schema object into a {@link SchemaNode} tree ready for traversal. */
export class TreeBuilder {
  constructor(private readonly schema: JsonSchemaObjectType) {}

  /** Entry point — returns the root {@link SchemaNode} for the schema. */
  build(): SchemaNode {
    return this.buildNode(this.schema);
  }

  private buildNode(schema: JsonSchemaObjectType): SchemaNode {
    const children = Object.entries(schema)
      .filter(([, value]) => value !== undefined)
      .flatMap(([prop, value]) => this.buildEdges(prop, value));

    return { schema, children };
  }

  /** Dispatches to the appropriate {@link EdgeBuilder}, or returns `[]` for unrecognised keywords. */
  private buildEdges(prop: string, value: unknown): SchemaEdge[] {
    const build = KEYWORD_BUILDERS.get(prop);
    if (!build) return [];
    const bc =
      SCHEMA_ARRAY_KEYWORDS.has(prop) || prop === 'properties'
        ? (s: JsonSchemaType) => this.buildBooleanOrChild(s)
        : (s: JsonSchemaType) => this.buildChild(s);
    return build(prop, value, bc);
  }

  /**
   * Resolves a child schema value to a node, preserving boolean schemas as nodes
   * with {@link SchemaNode.booleanSchema} set. Used for array-keyword contexts where
   * `true`/`false` schemas in `allOf`/`anyOf`/`oneOf` carry semantic meaning.
   */
  private buildBooleanOrChild(schema: JsonSchemaType): SchemaNode {
    if (typeof schema === 'boolean') return { schema: {}, children: [], booleanSchema: schema };
    return this.buildNode(schema);
  }

  /**
   * Resolves a child schema value to a node, or `null` for boolean schemas.
   * Boolean schemas in valued/record positions are handled directly by
   * `ConstraintMapper` on the parent schema.
   */
  private buildChild(schema: JsonSchemaType): SchemaNode | null {
    if (typeof schema === 'boolean') return null;
    return this.buildNode(schema);
  }
}
