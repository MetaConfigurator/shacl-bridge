import logger from '../logger';

export type ConditionalFunctions<T> = (condition: T) => boolean;
export type Action<T> = (action: T) => void;

export class Condition<T> {
  private candidate?: T;
  private gateConditions: ConditionalFunctions<T>[] = [];
  private normalConditions: ConditionalFunctions<T>[] = [];
  private onGateFailureAction?: Action<T>;
  private ifSatisfiedAction?: Action<T>;
  private otherwiseAction?: Action<T>;

  on<T>(candidate: T): Condition<T> {
    const builder = new Condition<T>();
    builder.candidate = candidate;
    return builder;
  }

  always(mandatoryCondition: ConditionalFunctions<T>) {
    this.gateConditions.push(mandatoryCondition);
    return this;
  }

  have(condition: ConditionalFunctions<T>) {
    this.normalConditions.push(condition);
    return this;
  }

  onMandatoryConditionFailure(action: Action<T>) {
    this.onGateFailureAction = action;
    return this;
  }

  ifSatisfied(action: Action<T>) {
    this.ifSatisfiedAction = action;
    return this;
  }

  otherwise(action: Action<T>) {
    this.otherwiseAction = action;
    return this;
  }

  execute(): void {
    const candidate = this.candidate;
    if (candidate == null) {
      logger.error(
        'No parameter for check, use on to specify parameter on which conditions needs to be checked'
      );
      return;
    }
    const gateEvaluationResult =
      this.gateConditions.length == 0 ? true : this.gateConditions.every((fn) => fn(candidate));
    if (!gateEvaluationResult) {
      logger.error('Mandatory condition failed.');
      if (this.onGateFailureAction) this.onGateFailureAction(candidate);
    }
    const otherConditionEvaluationResult =
      this.normalConditions.length == 0 ? true : this.normalConditions.every((fn) => fn(candidate));
    const functionToExecute = otherConditionEvaluationResult
      ? this.ifSatisfiedAction
      : this.otherwiseAction;

    if (functionToExecute) {
      functionToExecute(candidate);
    }
  }
}
