import { ConstraintRegistry } from './constraint-registry';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { DefaultStrategy } from './strategies/default-strategy';
import { NodeKindStrategy } from './strategies/node-kind-strategy';
import { EnumStrategy } from './strategies/enum-strategy';
import { NoStrategy } from './strategies/no-strategy';
import { JsonSchema } from '../../types';

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
>;

export class ConstraintConverter {
  private readonly registry;

  constructor() {
    this.registry = new ConstraintRegistry();
    this.populateAvailableStrategies();
  }

  convert(constraints: CoreConstraints): ConstraintResult {
    const result: ConstraintResult = {};
    for (const key of Object.keys(constraints) as (keyof CoreConstraints)[]) {
      const strategy = this.registry.get(key) ?? new NoStrategy();
      strategy.handle(constraints, result);
    }
    return result;
  }

  private populateAvailableStrategies() {
    this.registry
      .strategy('minLength', new DefaultStrategy('minLength', 'minLength'))
      .strategy('maxLength', new DefaultStrategy('maxLength', 'maxLength'))
      .strategy('pattern', new DefaultStrategy('pattern', 'pattern'))
      .strategy('minInclusive', new DefaultStrategy('minInclusive', 'minimum'))
      .strategy('maxInclusive', new DefaultStrategy('maxInclusive', 'maximum'))
      .strategy('minExclusive', new DefaultStrategy('minExclusive', 'exclusiveMinimum'))
      .strategy('maxExclusive', new DefaultStrategy('maxExclusive', 'exclusiveMaximum'))
      .strategy('nodeKind', new NodeKindStrategy())
      .strategy('in', new EnumStrategy('in', 'enum'));
  }
}
