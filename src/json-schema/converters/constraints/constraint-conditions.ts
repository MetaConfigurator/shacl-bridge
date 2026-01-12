import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { isNumericDatatype } from '../../../util/helpers';
import { ConversionContext } from './conversion-context';

export interface ConstraintCandidate {
  key: keyof CoreConstraints;
  context: ConversionContext;
  constraints: CoreConstraints;
}

export function isNotNull(candidate: ConstraintCandidate): boolean {
  const { key, constraints } = candidate;
  return key in constraints && constraints[key] != null;
}

export function arraySetByContext(candidate: ConstraintCandidate): boolean {
  const { context } = candidate;
  return context.isArray;
}

export function numericDatatypeSpecified(candidate: ConstraintCandidate): boolean {
  const { constraints } = candidate;
  return 'datatype' in constraints ? isNumericDatatype(constraints.datatype) : true;
}

export function setMinItems(candidate: ConstraintCandidate): boolean {
  const { context } = candidate;
  return context.setMinItems;
}

export function setMaxItems(candidate: ConstraintCandidate): boolean {
  const { context } = candidate;
  return context.setMaxItems;
}

export function stringValue(candidate: ConstraintCandidate): boolean {
  const { key, constraints } = candidate;
  return key in constraints && typeof constraints[key] === 'string';
}

export function nonEmptyArray(candidate: ConstraintCandidate): boolean {
  const { key, constraints } = candidate;
  if (!(key in constraints) || constraints[key] == null) return false;
  const value = constraints[key];
  return Array.isArray(value) && value.length > 0;
}
