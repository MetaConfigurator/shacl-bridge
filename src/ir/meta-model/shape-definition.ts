import { Shape } from './shape';
import { CoreConstraints } from './core-constraints';

type RdfValue =
  | { type: 'literal'; value: string; datatype?: string }
  | { type: 'uri'; value: string }
  | { type: 'langString'; value: string; language: string };

export interface AdditionalProperty {
  predicate: string;
  value: RdfValue;
}

export interface ShapeDefinition {
  nodeKey: string;
  shape?: Shape;
  coreConstraints?: CoreConstraints;
  dependentShapes?: ShapeDefinition[];
  additionalProperties?: AdditionalProperty[];
}
