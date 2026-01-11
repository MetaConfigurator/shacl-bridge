import logger from '../logger';

export interface Condition<T> {
  gate(gatingCondition: Condition<T>): Condition<T>;
  and(other: Condition<T>): Condition<T>;
  or(other: Condition<T>): Condition<T>;
  not(): Condition<T>;
  ifSatisfied(candidate: T, action: (candidate: T) => void): ConditionExecutor<T>;
  isSatisfiedBy(candidate: T): boolean;
}

export class ConditionExecutor<T> {
  constructor(
    private readonly condition: Condition<T>,
    private readonly candidate: T,
    private readonly executed: boolean,
    private readonly gatingConditionPassed?: boolean
  ) {}

  otherwise(action: (candidate: T) => void): void {
    if (!this.executed && this.gatingConditionPassed === true) {
      action(this.candidate);
    }
  }
}

export abstract class BaseCondition<T> implements Condition<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Condition<T>): Condition<T> {
    return new AndCondition(this, other);
  }

  or(other: Condition<T>): Condition<T> {
    return new OrCondition(this, other);
  }

  not(): Condition<T> {
    return new NotCondition(this);
  }

  gate(gatingCondition: Condition<T>): Condition<T> {
    return new GatedCondition(this, gatingCondition as BaseCondition<T>);
  }

  ifSatisfied(candidate: T, action: (candidate: T) => void): ConditionExecutor<T> {
    const isSatisfied = this.isSatisfiedBy(candidate);
    if (isSatisfied) {
      action(candidate);
    }
    return new ConditionExecutor(this, candidate, isSatisfied);
  }
}

class GatedCondition<T> extends BaseCondition<T> {
  constructor(
    private readonly wrappedCondition: BaseCondition<T>,
    private readonly gatingCondition: BaseCondition<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.wrappedCondition.isSatisfiedBy(candidate);
  }

  override ifSatisfied(candidate: T, action: (candidate: T) => void): ConditionExecutor<T> {
    const gatingPassed = this.gatingCondition.isSatisfiedBy(candidate);
    const isSatisfied = this.wrappedCondition.isSatisfiedBy(candidate);
    // Only execute action if gating condition passed AND main condition satisfied
    if (gatingPassed && isSatisfied) {
      action(candidate);
    }
    return new ConditionExecutor(this, candidate, isSatisfied && gatingPassed, gatingPassed);
  }
}

class AndCondition<T> extends BaseCondition<T> {
  constructor(
    private left: Condition<T>,
    private right: Condition<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrCondition<T> extends BaseCondition<T> {
  constructor(
    private left: Condition<T>,
    private right: Condition<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotCondition<T> extends BaseCondition<T> {
  constructor(private spec: Condition<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}

export class Check<T> {
  private candidate?: T;
  private condition?: BaseCondition<T>;
  private gatingCondition?: BaseCondition<T>;
  private onGateFailureAction?: (candidate: T) => void;
  private ifSatisfiedAction?: (candidate: T) => void;
  private otherwiseAction?: (candidate: T) => void;

  on<T>(candidate: T): Check<T> {
    const builder = new Check<T>();
    builder.candidate = candidate;
    return builder;
  }

  gate(condition: BaseCondition<T>): this {
    this.gatingCondition = condition;
    return this;
  }

  with(condition: BaseCondition<T>): this {
    this.condition = condition;
    return this;
  }

  and(condition: BaseCondition<T>): this {
    this.condition = this.condition?.and(condition) as BaseCondition<T>;
    return this;
  }

  or(condition: BaseCondition<T>): this {
    this.condition = this.condition?.or(condition) as BaseCondition<T>;
    return this;
  }

  not(): this {
    this.condition = this.condition?.not() as BaseCondition<T>;
    return this;
  }

  onGateFailure(action: (candidate: T) => void): this {
    this.onGateFailureAction = action;
    return this;
  }

  ifSatisfied(action: (candidate: T) => void): this {
    this.ifSatisfiedAction = action;
    return this;
  }

  otherwise(action: (candidate: T) => void): this {
    this.otherwiseAction = action;
    return this;
  }

  execute(): void {
    if (!this.candidate) return;

    // Check gating condition first
    if (this.gatingCondition) {
      const gatingPassed = this.gatingCondition.isSatisfiedBy(this.candidate);

      if (!gatingPassed) {
        // Gate failed - execute gate failure action if provided
        if (this.onGateFailureAction) {
          this.onGateFailureAction(this.candidate);
        } else {
          logger.warn('Condition failed with gate failure');
        }
        return;
      }
    }

    // Gate passed (or no gate), check main condition
    if (this.condition) {
      const isSatisfied = this.condition.isSatisfiedBy(this.candidate);

      if (isSatisfied) {
        this.ifSatisfiedAction?.(this.candidate);
      } else {
        this.otherwiseAction?.(this.candidate);
      }
    } else {
      // No condition specified, just execute ifSatisfied
      this.ifSatisfiedAction?.(this.candidate);
    }
  }
}
