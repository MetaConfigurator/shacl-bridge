import { JsonSchemaObjectType, JsonSchemaType } from './json-schema-type';
import { match } from 'ts-pattern';

function isEmptySchema(schema: JsonSchemaType): boolean {
  if (typeof schema === 'boolean') return false;
  if (Array.isArray(schema)) return false;
  return Object.keys(schema).length === 0;
}

function hasAllOf(schema: JsonSchemaType): boolean {
  return (
    typeof schema === 'object' &&
    !Array.isArray(schema) &&
    'allOf' in schema &&
    Array.isArray(schema.allOf)
  );
}

function mergeBothHaveAllOf(
  existing: JsonSchemaObjectType,
  source: JsonSchemaObjectType
): JsonSchemaObjectType {
  const newItems = (source.allOf ?? []).filter((item) => !isEmptySchema(item));
  existing.allOf?.push(...newItems);
  return existing;
}

function mergeExistingHasAllOf(
  existing: JsonSchemaObjectType,
  source: JsonSchemaType
): JsonSchemaObjectType {
  if (!isEmptySchema(source)) {
    existing.allOf?.push(source);
  }
  return existing;
}

function mergeSourceHasAllOf(
  existing: JsonSchemaType,
  source: JsonSchemaObjectType
): JsonSchemaObjectType | JsonSchemaType {
  const filteredAllOf = (source.allOf ?? []).filter((item) => !isEmptySchema(item));

  if (!isEmptySchema(existing)) {
    return { allOf: [existing, ...filteredAllOf] };
  }

  return filteredAllOf.length > 0 ? { allOf: filteredAllOf } : existing;
}

export function mergePropertySchemas(
  existing: JsonSchemaType,
  source: JsonSchemaType
): JsonSchemaType {
  const existingIsEmpty = isEmptySchema(existing);
  const sourceIsEmpty = isEmptySchema(source);
  const existingHasAllOf = hasAllOf(existing);
  const sourceHasAllOf = hasAllOf(source);

  return match({ existingIsEmpty, sourceIsEmpty, existingHasAllOf, sourceHasAllOf })
    .with({ sourceIsEmpty: true }, () => existing)
    .with({ existingIsEmpty: true, sourceIsEmpty: false, sourceHasAllOf: true }, () =>
      mergeSourceHasAllOf(existing, source as JsonSchemaObjectType)
    )
    .with({ existingIsEmpty: true, sourceIsEmpty: false }, () => source)
    .with({ existingHasAllOf: true, sourceHasAllOf: true }, () =>
      mergeBothHaveAllOf(existing as JsonSchemaObjectType, source as JsonSchemaObjectType)
    )
    .with({ existingHasAllOf: true, sourceHasAllOf: false }, () =>
      mergeExistingHasAllOf(existing as JsonSchemaObjectType, source)
    )
    .with({ existingHasAllOf: false, sourceHasAllOf: true }, () =>
      mergeSourceHasAllOf(existing, source as JsonSchemaObjectType)
    )
    .otherwise(() => ({ allOf: [existing, source] }));
}
