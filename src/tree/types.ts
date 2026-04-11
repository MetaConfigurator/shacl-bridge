import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';

export interface SchemaNode {
  schema: JsonSchemaObjectType;
  children: SchemaEdge[];
}

export interface SchemaEdge {
  label: string;
  key?: string;
  index?: number;
  node: SchemaNode;
}
