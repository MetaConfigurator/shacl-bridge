export const SCHEMA_VALUED_KEYWORDS = new Set([
  'items',
  'contains',
  'additionalProperties',
  'propertyNames',
  'if',
  'then',
  'else',
  'not',
  'unevaluatedItems',
  'unevaluatedProperties',
  'contentSchema',
]);

export const SCHEMA_ARRAY_KEYWORDS = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);

export const SCHEMA_RECORD_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
]);
