import {
  SCHEMA_ARRAY_KEYWORDS,
  SCHEMA_RECORD_KEYWORDS,
  SCHEMA_VALUED_KEYWORDS,
} from '../json-schema/keywords';
import { JsonSchemaObjectType, JsonSchemaType } from '../json-schema/meta/json-schema-type';
import { match, P } from 'ts-pattern';

const DEFS_KEYWORDS = new Set(['$defs', 'definitions']);

export class SchemaFlattener {
  private defs: Record<string, JsonSchemaType> = {};

  constructor(private schema: JsonSchemaObjectType) {}

  flatten(): JsonSchemaObjectType {
    for (const [defName, defSchema] of Object.entries(this.schema.$defs ?? {})) {
      this.defs[defName] = this.flattenSchema(defSchema, defName);
    }

    const result = this.flattenSchema(this.schema, '');

    if (typeof result === 'boolean') return this.schema;

    if (Object.keys(this.defs).length > 0) result.$defs = this.defs;

    return result;
  }

  private flattenSchema(schema: JsonSchemaType, path: string): JsonSchemaType {
    if (typeof schema === 'boolean') return schema;

    if (schema.$ref) return schema;

    const result: JsonSchemaObjectType = {};

    for (const [key, value] of Object.entries(schema)) {
      if (value === undefined || DEFS_KEYWORDS.has(key)) continue;
      match([key, value])
        .with([P.when((k) => SCHEMA_RECORD_KEYWORDS.has(k)), P._], () => {
          result[key] = this.flattenRecord(key, value as Record<string, JsonSchemaType>, path);
        })
        .with([P.when((k) => SCHEMA_ARRAY_KEYWORDS.has(k)), P._], () => {
          result[key] = this.flattenArray(key, value as JsonSchemaType[], path);
        })
        .with([P.when((k) => SCHEMA_VALUED_KEYWORDS.has(k)), P._], () => {
          result[key] = this.flattenValue(key, value as JsonSchemaType, path);
        })
        .otherwise(() => {
          result[key] = value as JsonSchemaType;
        });
    }
    return result;
  }

  private flattenRecord(
    key: string,
    record: Record<string, JsonSchemaType>,
    parentPath: string
  ): Record<string, JsonSchemaType> {
    const result: Record<string, JsonSchemaType> = {};
    for (const [propKey, propValue] of Object.entries(record)) {
      const defName = this.buildDefName(
        parentPath,
        key === 'properties' ? propKey : `${key}_${propKey}`
      );
      result[propKey] = this.extractToDef(defName, propValue, defName);
    }

    return result;
  }

  private flattenArray(
    key: string,
    schemas: JsonSchemaType[],
    parentPath: string
  ): JsonSchemaType[] {
    return schemas.map((schema, index) => {
      const defName = this.buildDefName(parentPath, `${key}_${String(index)}`);
      return this.extractToDef(defName, schema, defName);
    });
  }

  private flattenValue(key: string, schema: JsonSchemaType, parentPath: string): JsonSchemaType {
    if (typeof schema === 'boolean') {
      return schema;
    }

    const defName = this.buildDefName(parentPath, key);
    return this.extractToDef(defName, schema, defName);
  }

  private extractToDef(name: string, schema: JsonSchemaType, path: string): JsonSchemaType {
    if (typeof schema === 'boolean') {
      return schema;
    }

    if (schema.$ref) {
      return schema;
    }

    const uniqueName = this.findUniqueDefName(name);
    this.defs[uniqueName] = this.flattenSchema(schema, path);

    return { $ref: `#/$defs/${uniqueName}` };
  }

  private buildDefName(parentPath: string, name: string): string {
    return parentPath ? `${parentPath}_${name}` : name;
  }

  private findUniqueDefName(name: string): string {
    if (!this.defs[name]) {
      return name;
    }
    let index = 1;
    while (this.defs[`${name}_${String(index)}`]) {
      index++;
    }
    return `${name}_${String(index)}`;
  }
}
