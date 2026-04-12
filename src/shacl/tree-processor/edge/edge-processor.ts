import { SchemaEdge, SchemaNode } from '../../../tree/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';

export interface ChildNode {
  node: SchemaNode;
  subject: string;
  isBlank?: boolean;
  targetClass?: string;
}

export interface EdgeContext {
  edges: SchemaEdge[];
  subject?: string;
  isBlank?: boolean;
  schema?: JsonSchemaObjectType;
}

export interface EdgeProcessor {
  filter(edges: SchemaEdge[]): SchemaEdge[];
  prepare?(edges: SchemaEdge[]): SchemaEdge[];
  process(ctx: EdgeContext): ChildNode[];
}
