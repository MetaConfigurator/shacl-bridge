import logger from '../logger';

export type ConditionalFunctions<T> = (condition: T) => boolean;
export type Action<T> = (action: T) => void;

export class Condition<T> {
  private candidate?: T;
  private gateConditions: ConditionalFunctions<T>[] = [];
  private normalAndConditions: ConditionalFunctions<T>[] = [];
  private normalOrConditions: ConditionalFunctions<T>[] = [];
  private onGateFailureAction?: Action<T>;
  private ifSatisfiedAction?: Action<T>;
  private otherwiseAction?: Action<T>;

  on<T>(candidate: T): Condition<T> {
    const builder = new Condition<T>();
    builder.candidate = candidate;
    return builder;
  }

  must(mandatoryCondition: ConditionalFunctions<T>) {
    this.gateConditions.push(mandatoryCondition);
    return this;
  }

  allOf(condition: ConditionalFunctions<T>) {
    this.normalAndConditions.push(condition);
    return this;
  }

  anyOf(condition: ConditionalFunctions<T>) {
    this.normalOrConditions.push(condition);
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

  execute(): boolean {
    const candidate = this.candidate;
    if (candidate == null) {
      logger.error(
        'No parameter for check, use on to specify parameter on which conditions needs to be checked'
      );
      return false;
    }
    const gateEvaluationResult =
      this.gateConditions.length == 0 ? true : this.gateConditions.every((fn) => fn(candidate));
    if (!gateEvaluationResult) {
      if (this.onGateFailureAction) {
        this.onGateFailureAction(candidate);
        return false;
      }
    }
    const andConditionResult =
      this.normalAndConditions.length == 0
        ? true
        : this.normalAndConditions.every((fn) => fn(candidate));
    const orConditionResult =
      this.normalOrConditions.length == 0
        ? true
        : this.normalOrConditions.some((fn) => fn(candidate));
    const functionToExecute =
      gateEvaluationResult && andConditionResult && orConditionResult
        ? this.ifSatisfiedAction
        : this.otherwiseAction;

    if (functionToExecute) {
      functionToExecute(candidate);
    }
    return gateEvaluationResult && andConditionResult && orConditionResult;
  }
}
