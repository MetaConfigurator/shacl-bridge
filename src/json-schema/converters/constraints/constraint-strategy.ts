import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { JsonSchema } from '../../types';

export interface ConstraintStrategy {
  handle(constraints: CoreConstraints, result: JsonSchema): void;
}
