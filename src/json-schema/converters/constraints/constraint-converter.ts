import { ConstraintRegistry } from './constraint-registry';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { DefaultStrategy } from './strategies/default-strategy';
import { NodeKindStrategy } from './strategies/node-kind-strategy';
import { EnumStrategy } from './strategies/enum-strategy';
import { NoStrategy } from './strategies/no-strategy';
import { JsonSchema } from '../../types';
import { DefsStrategy } from './strategies/defs-strategy';
import { DatatypeStrategy } from './strategies/datatype-strategy';
import { QuantityStrategy } from './strategies/quantity-strategy';

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
  private schema: JsonSchema = {};

  constructor() {
    this.registry = new ConstraintRegistry();
    this.populateAvailableStrategies();
  }

  convert(constraints: CoreConstraints): JsonSchema {
    for (const key of Object.keys(constraints) as (keyof CoreConstraints)[]) {
      const strategy = this.registry.get(key) ?? new NoStrategy();
      strategy.handle(constraints, this.schema);
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
