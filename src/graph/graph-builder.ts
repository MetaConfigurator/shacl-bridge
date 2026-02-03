import { match } from 'ts-pattern';
import {
  SCHEMA_ARRAY_KEYWORDS,
  SCHEMA_RECORD_KEYWORDS,
  SCHEMA_VALUED_KEYWORDS,
} from '../json-schema/keywords';
import { JsonSchemaObjectType, JsonSchemaType } from '../json-schema/meta/json-schema-type';
import { Edge, JsonPrimitive, Node, NodeValue } from './types';

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export class GraphBuilder {
  private nodes: Node[] = [];
  private edges: Edge[] = [];

  constructor(private schema: JsonSchemaObjectType) {}

  build(): Graph {
    this.processSchema(this.schema, 'root');
    return { nodes: this.nodes, edges: this.edges };
  }

  private processSchema(schema: JsonSchemaObjectType, key: string): Node {
    const node: Node = { key, value: schema };
    this.nodes.push(node);

    for (const [prop, value] of Object.entries(schema)) {
      if (value === undefined) continue;

      match(prop)
        .when(
          (p) => SCHEMA_RECORD_KEYWORDS.has(p),
          () => {
            this.processSchemaRecord(node, prop, value as Record<string, JsonSchemaType>);
          }
        )
        .when(
          (p) => SCHEMA_ARRAY_KEYWORDS.has(p),
          () => {
            this.processSchemaArray(node, prop, value as JsonSchemaType[]);
          }
        )
        .when(
          (p) => SCHEMA_VALUED_KEYWORDS.has(p),
          () => {
            this.processSchemaValue(node, prop, value as JsonSchemaType);
          }
        )
        .otherwise(() => {
          this.processPrimitive(node, prop, value as JsonPrimitive | JsonPrimitive[]);
        });
    }

    return node;
  }

  private processSchemaRecord(
    parent: Node,
    label: string,
    record: Record<string, JsonSchemaType>
  ): void {
    for (const [propertyKey, value] of Object.entries(record)) {
      const childKey =
        label === '$defs' || label === 'definitions'
          ? `${label}/${propertyKey}`
          : `${parent.key}/${label}/${propertyKey}`;

      const childNode = this.processSchemaType(value, childKey);
      this.edges.push({ from: parent, to: childNode, label, propertyKey });
    }
  }

  private processSchemaArray(parent: Node, label: string, schemas: JsonSchemaType[]): void {
    schemas.forEach((schema, index) => {
      const childKey = `${parent.key}/${label}/${String(index)}`;
      const childNode = this.processSchemaType(schema, childKey);
      this.edges.push({ from: parent, to: childNode, label, index });
    });
  }

  private processSchemaValue(parent: Node, label: string, schema: JsonSchemaType): void {
    const childKey = `${parent.key}/${label}`;
    const childNode = this.processSchemaType(schema, childKey);
    this.edges.push({ from: parent, to: childNode, label });
  }

  private processSchemaType(schema: JsonSchemaType, key: string): Node {
    if (typeof schema === 'boolean') {
      return this.createPrimitiveNode(key, schema);
    }
    return this.processSchema(schema, key);
  }

  private processPrimitive(
    parent: Node,
    label: string,
    value: JsonPrimitive | JsonPrimitive[]
  ): void {
    const childKey = `${parent.key}/${label}`;
    const childNode = this.createPrimitiveNode(childKey, value as NodeValue);
    this.edges.push({ from: parent, to: childNode, label });
  }

  private createPrimitiveNode(key: string, value: NodeValue): Node {
    const node: Node = { key, value };
    this.nodes.push(node);
    return node;
  }
}
