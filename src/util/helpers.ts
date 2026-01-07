import { JsonSchemaObjectBuilder } from '../json-schema/meta/json-schema-object-builder';
import { match, P } from 'ts-pattern';
import { NodeKind } from '../ir/meta-model/node-kind';

export function extractName(uri: string): string {
  if (!uri) {
    return '';
  }

  const hashIndex = uri.lastIndexOf('#');
  if (hashIndex !== -1 && hashIndex < uri.length - 1) {
    return uri.substring(hashIndex + 1);
  }

  const slashIndex = uri.lastIndexOf('/');
  if (slashIndex !== -1 && slashIndex < uri.length - 1) {
    return uri.substring(slashIndex + 1);
  }

  return uri;
}

export function stripShape(name: string) {
  if (name.endsWith('Shape') || name.endsWith('shape')) {
    const withOutShape = name.replace(/Shape|shape$/g, '');
    if (withOutShape !== '') return withOutShape;
  }
  return name;
}

export function extractStrippedName(uri: string): string {
  return stripShape(extractName(uri));
}

export function hasKeyAtAnyLevel(obj: unknown, targetKey: string): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (targetKey in obj) {
    return true;
  }

  return Object.values(obj).some((value) => hasKeyAtAnyLevel(value, targetKey));
}

/**
 * Checks if a datatype URI represents a numeric type.
 * Used to determine if min/max constraints should be applied in JSON Schema.
 * @param datatypeUri - The XSD datatype URI
 * @returns true if the datatype is numeric (integer, decimal, float, etc.)
 */
export function isNumericDatatype(datatypeUri: string | undefined): boolean {
  if (!datatypeUri) return false;

  const numericTypes = [
    '#integer',
    '#int',
    '#long',
    '#short',
    '#byte',
    '#decimal',
    '#float',
    '#double',
    '#nonNegativeInteger',
    '#nonPositiveInteger',
    '#negativeInteger',
    '#positiveInteger',
    '#unsignedLong',
    '#unsignedInt',
    '#unsignedShort',
    '#unsignedByte',
  ];

  return numericTypes.some((type) => datatypeUri.endsWith(type));
}

export function mapDataType(
  datatypeUri: string | undefined,
  builder: JsonSchemaObjectBuilder
): void {
  if (!datatypeUri) return;
  match(datatypeUri)
    .with(
      P.when((datatypeUri) =>
        [
          '#nonNegativeInteger',
          '#unsignedInt',
          '#unsignedLong',
          '#unsignedShort',
          '#unsignedByte',
        ].some((val) => datatypeUri.endsWith(val))
      ),
      () => builder.type('integer').minimum(0)
    )
    .with(P.string.endsWith('#positiveInteger'), () => builder.type('integer').minimum(1))
    .with(P.string.endsWith('#nonPositiveInteger'), () => builder.type('integer').maximum(0))
    .with(P.string.endsWith('#negativeInteger'), () => builder.type('integer').maximum(-1))
    .with(
      P.when((datatypeUri) =>
        ['#integer', '#int', '#long', '#short', '#byte'].some((val) => datatypeUri.endsWith(val))
      ),
      () => builder.type('integer')
    )
    // Floating point types
    .with(
      P.when((datatypeUri) =>
        ['#decimal', '#float', '#double'].some((val) => datatypeUri.endsWith(val))
      ),
      () => builder.type('number')
    )
    // Boolean
    .with(P.string.endsWith('#boolean'), () => builder.type('boolean'))
    // Date and time types
    .with(P.string.endsWith('#dateTime'), () => builder.type('string').format('date-time'))
    .with(P.string.endsWith('#date'), () => builder.type('string').format('date'))
    .with(P.string.endsWith('#time'), () => builder.type('string').format('time'))
    .with(P.string.endsWith('#duration'), () => builder.type('string').format('duration'))
    // URI type
    .with(P.string.endsWith('#anyURI'), () => builder.type('string').format('uri'))
    .with(P.string.endsWith('#base64Binary'), () =>
      builder.type('string').contentEncoding('base64')
    )
    // All String types
    // Binary types, Unknown datatype, #gYearMonth
    // #gYear
    // #gMonthDay
    // #gMonth
    // #gDay
    // #normalizedString
    // #token
    .otherwise(() => builder.type('string'));
}

export function mapNodeKind(nodeKind: NodeKind, builder: JsonSchemaObjectBuilder): void {
  match(nodeKind)
    .with(NodeKind.IRI, () => builder.type('string').format('uri'))
    .with(NodeKind.LITERAL, () => builder.type(['string', 'number', 'boolean']))
    .with(NodeKind.BLANK_NODE, () => builder.type('object'))
    .with(NodeKind.BLANK_NODE_OR_IRI, () =>
      builder.oneOf([
        new JsonSchemaObjectBuilder().type('object').build(),
        new JsonSchemaObjectBuilder().type('string').format('uri').build(),
      ])
    )
    .with(NodeKind.BLANK_NODE_OR_LITERAL, () =>
      builder.oneOf([
        new JsonSchemaObjectBuilder().type('object').build(),
        new JsonSchemaObjectBuilder().type(['string', 'number', 'boolean']).build(),
      ])
    )
    .with(NodeKind.IRI_OR_LITERAL, () =>
      builder.oneOf([
        new JsonSchemaObjectBuilder().type('string').format('uri').build(),
        new JsonSchemaObjectBuilder().type(['string', 'number', 'boolean']).build(),
      ])
    )
    .exhaustive();
}

/**
 * Converts a string default value to the appropriate JavaScript type based on XSD datatype.
 * Used to convert SHACL sh:defaultValue to correctly-typed JSON Schema default values.
 * @param defaultValue - The string value from RDF
 * @param datatypeUri - The XSD datatype URI
 * @returns The value converted to the appropriate JavaScript type
 */
export function parseDefaultValue(
  defaultValue: string,
  datatypeUri: string | undefined
): string | number | boolean {
  if (!datatypeUri) return defaultValue;

  // Boolean types
  if (datatypeUri.endsWith('#boolean')) {
    return defaultValue === 'true' || defaultValue === '1';
  }

  // Integer types
  if (
    [
      '#integer',
      '#int',
      '#long',
      '#short',
      '#byte',
      '#nonNegativeInteger',
      '#nonPositiveInteger',
      '#negativeInteger',
      '#positiveInteger',
      '#unsignedLong',
      '#unsignedInt',
      '#unsignedShort',
      '#unsignedByte',
    ].some((type) => datatypeUri.endsWith(type))
  ) {
    return parseInt(defaultValue, 10);
  }

  // Floating point types
  if (['#decimal', '#float', '#double'].some((type) => datatypeUri.endsWith(type))) {
    return parseFloat(defaultValue);
  }

  // All other types (string, date, dateTime, URI, etc.) - keep as string
  return defaultValue;
}
