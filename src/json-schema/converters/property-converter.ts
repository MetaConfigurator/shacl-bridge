import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchema } from '../types';
import { extractName } from '../../util/helpers';
import { ConstraintConverter } from './constraints/constraint-converter';

export interface PropertyConversionResult {
  propertyName: string;
  schema: JsonSchema;
  required: boolean;
}

export class PropertyConverter {
  private readonly constraintConverter: ConstraintConverter;

  constructor() {
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

    // Apply constraints
    const constraintSchema = this.constraintConverter.convert(constraints);

    // Build final schema based on cardinality
    let schema: JsonSchema;
    if (isArray) {
      schema = {
        type: 'array',
        items: constraintSchema,
      };

      // Set array cardinality constraints
      if (constraints.minCount !== undefined && constraints.minCount > 0) {
        schema.minItems = constraints.minCount;
      }
      if (constraints.maxCount !== undefined) {
        schema.maxItems = constraints.maxCount;
      }
    } else {
      schema = constraintSchema;
    }

    return {
      propertyName,
      schema,
      required,
    };
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
