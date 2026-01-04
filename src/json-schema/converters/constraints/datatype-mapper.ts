import { match, P } from 'ts-pattern';
import { JsonSchema } from '../../types';

export type DatatypeMapping = Pick<JsonSchema, 'type' | 'format' | 'minimum' | 'maximum'>;

export class DatatypeMapper {
  /**
   * Maps an XSD datatype URI to JSON Schema type properties
   * @param datatypeUri The full XSD datatype URI
   * @returns JSON Schema type properties or undefined if not mappable
   */
  map(datatypeUri: string): DatatypeMapping {
    return (
      match(datatypeUri)
        // String types
        .with(P.string.endsWith('#normalizedString'), () => ({ type: 'string' as const }))
        .with(P.string.endsWith('#token'), () => ({ type: 'string' as const }))

        // Integer types (order matters - more specific patterns first)
        .with(P.string.endsWith('#nonNegativeInteger'), () => ({
          type: 'integer' as const,
          minimum: 0,
        }))
        .with(P.string.endsWith('#positiveInteger'), () => ({
          type: 'integer' as const,
          minimum: 1,
        }))
        .with(P.string.endsWith('#nonPositiveInteger'), () => ({
          type: 'integer' as const,
          maximum: 0,
        }))
        .with(P.string.endsWith('#negativeInteger'), () => ({
          type: 'integer' as const,
          maximum: -1,
        }))
        .with(P.string.endsWith('#unsignedInt'), () => ({
          type: 'integer' as const,
          minimum: 0,
        }))
        .with(P.string.endsWith('#unsignedLong'), () => ({
          type: 'integer' as const,
          minimum: 0,
        }))
        .with(P.string.endsWith('#unsignedShort'), () => ({
          type: 'integer' as const,
          minimum: 0,
        }))
        .with(P.string.endsWith('#unsignedByte'), () => ({
          type: 'integer' as const,
          minimum: 0,
        }))
        .with(P.string.endsWith('#integer'), () => ({ type: 'integer' as const }))
        .with(P.string.endsWith('#int'), () => ({ type: 'integer' as const }))
        .with(P.string.endsWith('#long'), () => ({ type: 'integer' as const }))
        .with(P.string.endsWith('#short'), () => ({ type: 'integer' as const }))
        .with(P.string.endsWith('#byte'), () => ({ type: 'integer' as const }))

        // Floating point types
        .with(P.string.endsWith('#decimal'), () => ({ type: 'number' as const }))
        .with(P.string.endsWith('#float'), () => ({ type: 'number' as const }))
        .with(P.string.endsWith('#double'), () => ({ type: 'number' as const }))

        // Boolean
        .with(P.string.endsWith('#boolean'), () => ({ type: 'boolean' as const }))

        // Date and time types (order matters - more specific patterns first)
        .with(P.string.endsWith('#dateTime'), () => ({
          type: 'string' as const,
          format: 'date-time',
        }))
        .with(P.string.endsWith('#date'), () => ({
          type: 'string' as const,
          format: 'date',
        }))
        .with(P.string.endsWith('#time'), () => ({
          type: 'string' as const,
          format: 'time',
        }))
        .with(P.string.endsWith('#duration'), () => ({
          type: 'string' as const,
          format: 'duration',
        }))
        .with(P.string.endsWith('#gYearMonth'), () => ({ type: 'string' as const }))
        .with(P.string.endsWith('#gYear'), () => ({ type: 'string' as const }))
        .with(P.string.endsWith('#gMonthDay'), () => ({ type: 'string' as const }))
        .with(P.string.endsWith('#gMonth'), () => ({ type: 'string' as const }))
        .with(P.string.endsWith('#gDay'), () => ({ type: 'string' as const }))

        // URI type
        .with(P.string.endsWith('#anyURI'), () => ({
          type: 'string' as const,
          format: 'uri',
        }))

        // Binary types
        .with(P.string.endsWith('#base64Binary'), () => ({ type: 'string' as const }))
        .with(P.string.endsWith('#hexBinary'), () => ({ type: 'string' as const }))

        // Unknown datatype
        .otherwise(() => ({ type: 'string' as const }))
    );
  }
}
