import { Shape } from './shape';
import { CoreConstraints } from './core-constraints';

export interface ShapeDefinition {
  nodeKey: string;
  shape?: Shape;
  coreConstraints?: CoreConstraints;
  dependentShapes?: (ShapeDefinition | undefined)[];
  customProperties?: Record<string, string>;
}
