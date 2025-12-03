import { ShapeDefinition } from './shapeDefinition';
import { NodeKind } from './nodeKind';

export interface CoreConstraints {
  property?: string[];
  class?: string; // TODO : Maybe move to Shape Skip for now
  closed?: boolean;
  datatype?: string;
  equals?: string; // TODO: Maybe move to Shape
  hasValue?: boolean;
  lessThan?: string;
  lessThanOrEquals?: string;
  maxCount?: number;
  maxExclusive?: number;
  maxInclusive?: number;
  maxLength?: number;
  minCount?: number;
  minExclusive?: number;
  minInclusive?: number;
  minLength?: number;
  node?: string;
  nodeKind?: NodeKind;
  qualifiedMaxCount?: number;
  qualifiedMinCount?: number;
  qualifiedValueShape?: string;
  qualifiedValueShapesDisjoint?: boolean;
  uniqueLang?: boolean;
  pattern?: string;
  first?: string;
  rest?: string;
  ignoredProperties?: string[]; // Skip for now
  in?: string[];
  or?: string[];
  and?: string[];
  not?: string[];
  xone?: string[];
  languageIn?: string[]; // TODO
  disjoint?: ShapeDefinition[]; // TODO: Verify
}
