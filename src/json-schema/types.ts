/**
 * JSON Schema types following JSON Schema Draft 2020-12
 */

export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;

  // Type
  type?: JsonSchemaType | JsonSchemaType[];
  format?: string;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Numeric constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;

  // Array constraints
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object constraints
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;

  // Enum
  enum?: (string | number | boolean | null)[];
  const?: string | number | boolean | null;

  // Composition
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;

  // Metadata
  title?: string;
  description?: string;

  // SHACL extensions (x-shacl-*)
  'x-shacl-targetClass'?: string;
  'x-shacl-severity'?: string;
  'x-shacl-message'?: string;
  'x-shacl-nodeKind'?: string;
  'x-shacl-closed'?: boolean;

  // RDF metadata extension
  'x-rdf-properties'?: {
    predicate: string;
    value: unknown;
  }[];
}

export type UnmappableConstraintStrategy = 'extension' | 'warn' | 'error';

export enum Mode {
  Single = 'single',
  Multi = 'multi',
}

export interface GeneratorConfig {
  mode: Mode;
  includeMetadata?: boolean;
  preserveRdfMetadata?: boolean;
  unmappableConstraints?: UnmappableConstraintStrategy;
}

export type Result = JsonSchema | { schemas: Map<string, JsonSchema> };

export function isSingleSchemaResult(result: Result): boolean {
  return !('schemas' in result);
}

export function isMultiSchemaResult(result: Result): boolean {
  return 'schemas' in result;
}
