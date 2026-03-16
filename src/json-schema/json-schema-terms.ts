export const JSON_SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';

export const JSON_SCHEMA_UNHANDLED_KEYS = new Set([
  'if',
  'then',
  'else',
  'prefixItems',
  'patternProperties',
  'dependentRequired',
  'dependentSchemas',
  'contentEncoding',
  'contentMediaType',
  'contentSchema',
  'propertyNames',
  'minProperties',
  'maxProperties',
  'multipleOf',
  'uniqueItems',
  'readOnly',
  'writeOnly',
  'examples',
  'unevaluatedItems',
  '$comment',
  '$schema',
  '$id',
  '$anchor',
  '$dynamicAnchor',
  '$dynamicRef',
]);

export const JSON_SCHEMA_METADATA_KEYS = new Set(['title', 'description', '$defs', 'definitions']);

export const JSON_SCHEMA_SHACL_EDGE_LABELS = new Set([
  'properties',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'items',
  'contains',
  '$ref',
]);
