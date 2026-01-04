import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchemaObjectType, JsonSchemaType } from '../json-schema-type';
import { ConstraintConverter } from './constraints/constraint-converter';
import { Index } from '../../ir/indexer';

export class ShapeConverter {
  constructor(
    private readonly shape: ShapeDefinition,
    private readonly index: Index,
    private schema: JsonSchemaObjectType
  ) {}

  isRequired(): boolean {
    return (
      (this.shape.coreConstraints?.minCount ?? 0) > 0 ||
      (this.shape.coreConstraints?.minLength ?? 0) > 0
    );
  }

  convert(): { required: string[]; result: JsonSchemaObjectType } {
    const result = new ConstraintConverter().convert(this.shape.coreConstraints ?? {});
    const required: string[] = [];
    const target = [...this.index.targets.entries()]
      .filter(([key]) => key.value === this.shape.nodeKey)
      .map(([, val]) => val)
      .flat(1)[0];
    if ((this.shape.coreConstraints?.property?.length ?? 0) > 0) {
      return {
        required: [],
        result: {
          properties: this.schema as Record<string, JsonSchemaType>,
        },
      };
    }
    if (this.isRequired()) {
      required.push(target);
    }

    // Handle array restructuring
    let propertySchema: JsonSchemaObjectType;
    if (result.type === 'array') {
      // Extract array-level constraints and items
      const { minItems, maxItems, type, items, ...itemConstraints } = result;

      // Use existing items (if already created by QuantityStrategy) or itemConstraints
      const itemsSchema = items ?? (Object.keys(itemConstraints).length > 0 ? itemConstraints : {});

      // Create proper array structure with constraints at parent level
      propertySchema = {
        type: 'array',
        ...(minItems !== undefined && { minItems }),
        ...(maxItems !== undefined && { maxItems }),
        items: itemsSchema,
      };
    } else {
      // Not an array - use result as-is, but remove any minItems/maxItems
      // (they don't apply to non-array properties)
      delete result.minItems;
      delete result.maxItems;
      propertySchema = result;
    }

    return {
      required: required,
      result: {
        [target]: propertySchema,
      },
    };
  }
}
