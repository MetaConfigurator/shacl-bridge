import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';

export type JsonPrimitive = string | number | boolean | null;

export type NodeValue = JsonSchemaObjectType | JsonPrimitive | JsonPrimitive[];

export interface Node {
  key: string;
  value: NodeValue;
}

export interface Edge {
  from: Node;
  to: Node;
  label: string;
  index?: number;
  propertyKey?: string;
}
