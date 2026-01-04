import { ConstraintStrategy } from './constraint-strategy';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { NoStrategy } from './strategies/no-strategy';

export class ConstraintRegistry {
  private readonly strategies = new Map<keyof CoreConstraints, ConstraintStrategy>();
  strategy(key: keyof CoreConstraints, strategy: ConstraintStrategy): this {
    this.strategies.set(key, strategy);
    return this;
  }
  get(key: keyof CoreConstraints): ConstraintStrategy {
    if (!this.strategies.has(key)) {
      return new NoStrategy();
    }
    return this.strategies.get(key) ?? new NoStrategy();
  }
}
