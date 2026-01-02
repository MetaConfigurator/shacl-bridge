import { ConstraintStrategy } from '../constraint-strategy';
import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintResult } from '../constraint-converter';

export class DefaultStrategy<K extends keyof CoreConstraints, S extends keyof ConstraintResult>
  implements ConstraintStrategy
{
  constructor(
    private readonly constraintKey: K,
    private readonly schemaKey: S
  ) {}

  handle(constraints: CoreConstraints, result: ConstraintResult): void {
    const value = constraints[this.constraintKey];
    if (value == null) return;
    result[this.schemaKey] = value as ConstraintResult[S];
  }
}
