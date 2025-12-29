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
  /**
   * Output mode:
   * - 'single': All shapes in one schema with $defs
   * - 'multi': One schema file per named shape
   */
  mode: Mode;

  /**
   * Include SHACL metadata as x-shacl-* extensions
   */
  includeMetadata?: boolean;

  /**
   * Preserve non-SHACL RDF properties as x-rdf-properties
   */
  preserveRdfMetadata?: boolean;

  /**
   * How to handle SHACL constraints without JSON Schema equivalent:
   * - 'extension': Add as x-shacl-* (default)
   * - 'warn': Log warning and skip
   * - 'error': Throw error
   */
  unmappableConstraints?: UnmappableConstraintStrategy;
}

/**
 * Result of JSON Schema generation in single mode
 */
export interface SingleSchemaResult {
  schema: JsonSchema;
}

/**
 * Result of JSON Schema generation in multi mode
 */
export interface MultiSchemaResult {
  schemas: Map<string, JsonSchema>;
}

export type GeneratorResult = SingleSchemaResult | MultiSchemaResult;

/**
 * Type guard for SingleSchemaResult
 */
export function isSingleSchemaResult(result: GeneratorResult): result is SingleSchemaResult {
  return 'schema' in result;
}

/**
 * Type guard for MultiSchemaResult
 */
export function isMultiSchemaResult(result: GeneratorResult): result is MultiSchemaResult {
  return 'schemas' in result;
}
