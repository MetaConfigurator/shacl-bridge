import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintResult } from '../constraint-converter';
import { ConstraintStrategy } from '../constraint-strategy';
import { JsonSchema } from '../../../types';

export class QuantityStrategy<K extends keyof CoreConstraints, S extends keyof ConstraintResult>
  implements ConstraintStrategy
{
  constructor(
    private readonly constraintKey: K,
    private readonly schemaKey: S,
    private readonly condition?: (value: number) => boolean
  ) {}

  handle(constraints: CoreConstraints, schema: JsonSchema): void {
    const value = constraints[this.constraintKey] as number;
    const shouldApply = this.condition ? this.condition(value) : true;
    if (shouldApply) schema[this.schemaKey] = value as ConstraintResult[S];
  }
}
