import { RdfValue } from './shape-definition';

export enum SHAPE_TYPE {
  NODE_SHAPE = 'sh:NodeShape',
  PROPERTY_SHAPE = 'sh:PropertyShape',
}

export enum SEVERITY {
  VIOLATION = 'sh:Violation',
  WARNING = 'sh:Warning',
  INFO = 'sh:Info',
}

export interface Shape {
  type: SHAPE_TYPE;
  path?: string;
  targetClasses?: string[];
  targetNodes?: string[];
  rdfTypes?: string[];
  targetObjectsOf?: string[];
  targetSubjectsOf?: string[];
  deactivated?: boolean;
  message?: RdfValue[];
  severity?: SEVERITY;
}
