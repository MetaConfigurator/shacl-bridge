import { BaseCondition } from '../../../condition/condition';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { isNumericDatatype } from '../../../util/helpers';
import { ConversionContext } from './conversion-context';

// Candidate type for constraint checking
export interface ConstraintCandidate {
  key: keyof CoreConstraints;
  context: ConversionContext;
  constraints: CoreConstraints;
}

// Checks if a constraint key has a non-null value
export class IsNotNull extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { key, constraints } = candidate;
    return key in constraints && constraints[key] != null;
  }
}

// Checks if the datatype constraint exists and is numeric
export class IsNumericDatatypeIfSpecified extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { constraints } = candidate;
    return 'datatype' in constraints ? isNumericDatatype(constraints.datatype) : true;
  }
}

// Checks if the constraint value is a non-empty array
export class IsNonEmptyArray extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { key, constraints } = candidate;
    if (!(key in constraints) || constraints[key] == null) return false;
    const value = constraints[key];
    return Array.isArray(value) && value.length > 0;
  }
}

export class ArraySetByContext extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { context } = candidate;
    return context.isArray;
  }
}

export class SetMinItems extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { context } = candidate;
    return context.setMinItems;
  }
}

export class SetMaxItems extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { context } = candidate;
    return context.setMaxItems;
  }
}

export class IsStringValue extends BaseCondition<ConstraintCandidate> {
  isSatisfiedBy(candidate: ConstraintCandidate): boolean {
    const { constraints } = candidate;
    return 'hasValue' in constraints && typeof constraints.hasValue === 'string';
  }
}
