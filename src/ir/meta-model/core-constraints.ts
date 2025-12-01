import { ShapeDefinition } from './shapeDefinition';
import { NodeKind } from './nodeKind';
import { Shape } from './shape';

export interface CoreConstraints {
  and?: ShapeDefinition[];
  class?: string; // TODO : Maybe move to Shape Skip for now
  closed?: boolean;
  ignoredProperties?: ShapeDefinition[]; // Skip for now
  datatype?: string;
  disjoint?: ShapeDefinition[]; // TODO: Verify
  equals?: string; // TODO: Maybe move to Shape
  hasValue?: string;
  in?: ShapeDefinition[];
  languageIn?: ShapeDefinition[];
  lessThan?: string;
  lessThanOrEquals?: string;
  maxCount?: number;
  maxExclusive?: string;
  maxInclusive?: string;
  maxLength?: number;
  minCount?: number;
  minExclusive?: string;
  minInclusive?: string;
  minLength?: number;
  node?: string;
  nodeKind?: NodeKind;
  not?: ShapeDefinition[];
  or?: ShapeDefinition[];
  property?: string;
  qualifiedMaxCount?: number;
  qualifiedMinCount?: number;
  qualifiedValueShape?: Shape;
  qualifiedValueShapesDisjoint?: boolean;
  uniqueLang?: boolean;
  xone?: ShapeDefinition[];
  pattern?: string;
}
