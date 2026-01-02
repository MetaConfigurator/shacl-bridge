import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { ConstraintResult } from './constraint-converter';

export interface ConstraintStrategy {
  handle(constraints: CoreConstraints, result: ConstraintResult): void;
}
