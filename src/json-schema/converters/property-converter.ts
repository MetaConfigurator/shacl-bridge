import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchema } from '../types';
import { extractStrippedName } from '../../util/helpers';
import { ConstraintConverter } from './constraints/constraint-converter';

export interface PropertyConversionResult {
  propertyName: string;
  schema: JsonSchema;
  required: boolean;
}

export class PropertyConverter {
  private readonly constraintConverter: ConstraintConverter = new ConstraintConverter();

  convert(propertyShape: ShapeDefinition): PropertyConversionResult {
    const constraints = propertyShape.coreConstraints ?? {};
    const propertyName = extractStrippedName(propertyShape.shape?.path ?? '');
    const isArray = this.isArrayProperty(constraints.minCount, constraints.maxCount);
    const required = this.isRequired(constraints.minCount);
    const schema = this.constraintConverter.array(isArray).convert(constraints);
    return {
      propertyName,
      schema,
      required,
    };
  }

  private isRequired(minCount: number | undefined): boolean {
    return minCount != null && minCount >= 1;
  }

  /**
   * Determines if property should be an array based on cardinality
   * - maxCount === 1: single value
   * - maxCount > 1: array
   * - maxCount undefined + minCount defined: array (user explicitly thinking about cardinality)
   * - maxCount undefined + minCount undefined: single value (default for JSON usability)
   */
  private isArrayProperty(minCount: number | undefined, maxCount: number | undefined): boolean {
    if (maxCount != null) {
      return maxCount > 1;
    }
    // If maxCount is undefined but minCount is defined, treat as unbounded array
    return minCount != null;
  }
}
