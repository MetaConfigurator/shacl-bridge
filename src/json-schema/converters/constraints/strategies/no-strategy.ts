import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import logger from '../../../../logger';
import { ConstraintResult } from '../constraint-converter';

export class NoStrategy implements ConstraintStrategy {
  handle(constraints: CoreConstraints, result: ConstraintResult): void {
    logger.warn(
      `Cannot handle a core constraint, ${JSON.stringify(constraints)} : ${JSON.stringify(result)}`
    );
  }
}
