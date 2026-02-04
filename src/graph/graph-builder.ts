import { match } from 'ts-pattern';
import {
  SCHEMA_ARRAY_KEYWORDS,
  SCHEMA_RECORD_KEYWORDS,
  SCHEMA_VALUED_KEYWORDS,
} from '../json-schema/keywords';
import { JsonSchemaObjectType, JsonSchemaType } from '../json-schema/meta/json-schema-type';
import { GraphStore } from './graph-store';
import { KeyGenerator } from './key-generator';
import { Graph, JsonPrimitive, Node, NodeValue } from './types';

export class GraphBuilder {
  private store = new GraphStore();
  private keyGenerator = new KeyGenerator();

  constructor(private schema: JsonSchemaObjectType) {}

  build(): Graph {
    this.processSchema(this.schema, 'root');
    return this.store.getGraph();
  }

  private processSchema(schema: JsonSchemaObjectType, key: string): Node {
    // Add the current node
    const node: Node = { key, value: schema };
    this.store.addNode(node);

    // For the properties of the schema, walk through it and add them to the graph
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
      const childKey = this.keyGenerator.forRecord(parent.key, label, propertyKey);
      const childNode = this.processSchemaType(value, childKey);
      this.store.addEdge({ from: parent, to: childNode, label, propertyKey });
    }
  }

  private processSchemaArray(parent: Node, label: string, schemas: JsonSchemaType[]): void {
    schemas.forEach((schema, index) => {
      const childKey = this.keyGenerator.forArrayItem(parent.key, label, index);
      const childNode = this.processSchemaType(schema, childKey);
      this.store.addEdge({ from: parent, to: childNode, label, index });
    });
  }

  private processSchemaValue(parent: Node, label: string, schema: JsonSchemaType): void {
    const childKey = this.keyGenerator.forValue(parent.key, label);
    const childNode = this.processSchemaType(schema, childKey);
    this.store.addEdge({ from: parent, to: childNode, label });
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
    const childKey = this.keyGenerator.forValue(parent.key, label);
    const childNode = this.createPrimitiveNode(childKey, value as NodeValue);
    this.store.addEdge({ from: parent, to: childNode, label });
  }

  private createPrimitiveNode(key: string, value: NodeValue): Node {
    const node: Node = { key, value };
    this.store.addNode(node);
    return node;
  }
}
