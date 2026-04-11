import { SchemaEdge, SchemaNode } from '../../../tree/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';

export type ProcessFn = (
  node: SchemaNode,
  subject: string,
  isBlank?: boolean,
  targetClass?: string
) => void;

export interface EdgeProcessor {
  process(
    edges: SchemaEdge[],
    subject: string,
    isBlank: boolean,
    parentSchema?: JsonSchemaObjectType
  ): void;
}
