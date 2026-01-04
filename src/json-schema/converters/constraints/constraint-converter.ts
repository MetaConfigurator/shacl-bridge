import { ConstraintRegistry } from './constraint-registry';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { DefaultStrategy } from './strategies/default-strategy';
import { NodeKindStrategy } from './strategies/node-kind-strategy';
import { EnumStrategy } from './strategies/enum-strategy';
import { JsonSchema } from '../../types';
import { DefsStrategy } from './strategies/defs-strategy';
import { DatatypeStrategy } from './strategies/datatype-strategy';
import { QuantityStrategy } from './strategies/quantity-strategy';
import { JsonSchemaObjectType } from '../../json-schema-type';

export type ConstraintResult = Pick<
  JsonSchema,
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'type'
  | 'format'
  | 'enum'
  | 'x-shacl-nodeKind'
  | '$ref'
  | 'minItems'
  | 'maxItems'
>;

export class ConstraintConverter {
  private readonly registry;
  private schema: JsonSchemaObjectType = {};

  constructor() {
    this.registry = new ConstraintRegistry();
    this.populateAvailableStrategies();
  }

  array(isArray: boolean): this {
    this.schema = isArray ? { type: 'array', items: {} } : {};
    return this;
  }

  convert(constraints: CoreConstraints): JsonSchemaObjectType {
    const hasArrayWrapper = this.schema.type === 'array' && this.schema.items !== undefined;
    for (const key of Object.keys(constraints) as (keyof CoreConstraints)[]) {
      const strategy = this.registry.get(key);
      const isArrayLevelConstraint = key === 'minCount' || key === 'maxCount';
      const target =
        hasArrayWrapper && !isArrayLevelConstraint ? (this.schema.items ?? {}) : this.schema;
      strategy.handle(constraints, target);
    }

    // If there's a $ref (from sh:node/sh:class) with no cardinality constraints,
    // default to array (SHACL properties are multi-valued by default)
    const hasRef = this.schema.$ref != null;
    const hasCardinalityConstraints = constraints.minCount != null || constraints.maxCount != null;
    if (hasRef && !hasCardinalityConstraints && this.schema.type !== 'array') {
      this.schema.type = 'array';
    }

    return this.schema;
  }

  private populateAvailableStrategies() {
    this.registry
      .strategy('datatype', new DatatypeStrategy())
      .strategy('minLength', new DefaultStrategy('minLength', 'minLength'))
      .strategy('maxLength', new DefaultStrategy('maxLength', 'maxLength'))
      .strategy('pattern', new DefaultStrategy('pattern', 'pattern'))
      .strategy('minInclusive', new DefaultStrategy('minInclusive', 'minimum'))
      .strategy('maxInclusive', new DefaultStrategy('maxInclusive', 'maximum'))
      .strategy('minExclusive', new DefaultStrategy('minExclusive', 'exclusiveMinimum'))
      .strategy('maxExclusive', new DefaultStrategy('maxExclusive', 'exclusiveMaximum'))
      .strategy('nodeKind', new NodeKindStrategy())
      .strategy('in', new EnumStrategy('in', 'enum'))
      .strategy('class', new DefsStrategy('class', '$ref'))
      .strategy('node', new DefsStrategy('node', '$ref'))
      .strategy('minCount', new QuantityStrategy('minCount', 'minItems', (val) => val > 0))
      .strategy('maxCount', new QuantityStrategy('maxCount', 'maxItems'));
  }
}
