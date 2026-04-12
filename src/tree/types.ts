import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';

export interface SchemaNode {
  schema: JsonSchemaObjectType;
  children: SchemaEdge[];
  booleanSchema?: boolean;
}

export interface SchemaEdge {
  label: string;
  key?: string;
  index?: number;
  node: SchemaNode;
}
