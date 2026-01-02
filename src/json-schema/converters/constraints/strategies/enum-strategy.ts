import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import { ConstraintResult } from '../constraint-converter';

export class EnumStrategy<K extends keyof CoreConstraints, S extends keyof ConstraintResult>
  implements ConstraintStrategy
{
  constructor(
    private readonly constraintKey: K,
    private readonly schemaKey: S
  ) {}

  handle(constraints: CoreConstraints, result: ConstraintResult): void {
    const value = constraints[this.constraintKey];
    if (value == null) return;
    if (!Array.isArray(value) || value.length == 0) return;
    result[this.schemaKey] = value as ConstraintResult[S];
  }
}
