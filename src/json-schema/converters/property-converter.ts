import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchema } from '../types';
import { DatatypeMapper } from './datatype-mapper';
import { extractName } from '../../util/helpers';
import { ConstraintConverter } from './constraints/constraint-converter';

export interface PropertyConversionResult {
  propertyName: string;
  schema: JsonSchema;
  required: boolean;
}

export class PropertyConverter {
  private readonly datatypeMapper: DatatypeMapper;
  private readonly constraintConverter: ConstraintConverter;

  constructor() {
    this.datatypeMapper = new DatatypeMapper();
    this.constraintConverter = new ConstraintConverter();
  }

  /**
   * Converts a PropertyShape to a JSON Schema property definition
   * @param propertyShape The SHACL PropertyShape definition
   * @returns Property conversion result with name, schema, and required flag
   */
  convert(propertyShape: ShapeDefinition): PropertyConversionResult {
    const path = propertyShape.shape?.path ?? '';
    const propertyName = extractName(path);
    const constraints = propertyShape.coreConstraints ?? {};

    // Determine if this is an array property
    const isArray = this.isArrayProperty(constraints.minCount, constraints.maxCount);
    const required = this.isRequired(constraints.minCount);

    // Build the base schema for the property value
    let valueSchema: JsonSchema = {};

    // Apply datatype mapping
    if (constraints.datatype) {
      const datatypeSchema = this.datatypeMapper.map(constraints.datatype);
      valueSchema = { ...valueSchema, ...datatypeSchema };
    }

    // Apply class reference
    if (constraints.class) {
      const className = extractName(constraints.class);
      valueSchema.$ref = `#/$defs/${className}`;
    }

    // Apply sh:node reference (value must conform to a shape)
    if (constraints.node) {
      const shapeName = extractName(constraints.node);
      valueSchema.$ref = `#/$defs/${shapeName}`;
    }

    // Apply constraints
    const constraintSchema = this.constraintConverter.convert(constraints);
    valueSchema = { ...valueSchema, ...constraintSchema };

    // Build final schema based on cardinality
    let schema: JsonSchema;
    if (isArray) {
      schema = {
        type: 'array',
        items: valueSchema,
      };

      // Set array cardinality constraints
      if (constraints.minCount !== undefined && constraints.minCount > 0) {
        schema.minItems = constraints.minCount;
      }
      if (constraints.maxCount !== undefined) {
        schema.maxItems = constraints.maxCount;
      }
    } else {
      schema = valueSchema;
    }

    return {
      propertyName,
      schema,
      required,
    };
  }

  /**
   * Extracts property name from a path URI
   * Takes the last segment after / or #
   */
  private extractPropertyName(path: string): string {
    if (!path) {
      return '';
    }

    // Try hash fragment first
    const hashIndex = path.lastIndexOf('#');
    if (hashIndex !== -1 && hashIndex < path.length - 1) {
      return path.substring(hashIndex + 1);
    }

    // Fall back to last path segment
    const slashIndex = path.lastIndexOf('/');
    if (slashIndex !== -1 && slashIndex < path.length - 1) {
      return path.substring(slashIndex + 1);
    }

    return path;
  }

  /**
   * Determines if property is required based on minCount
   */
  private isRequired(minCount: number | undefined): boolean {
    return minCount !== undefined && minCount >= 1;
  }

  /**
   * Determines if property should be an array based on cardinality
   * - maxCount === 1: single value
   * - maxCount > 1: array
   * - maxCount undefined + minCount defined: array (user explicitly thinking about cardinality)
   * - maxCount undefined + minCount undefined: single value (default for JSON usability)
   */
  private isArrayProperty(minCount: number | undefined, maxCount: number | undefined): boolean {
    if (maxCount !== undefined) {
      return maxCount > 1;
    }
    // If maxCount is undefined but minCount is defined, treat as unbounded array
    return minCount !== undefined;
  }
}
