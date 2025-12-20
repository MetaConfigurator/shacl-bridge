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
  targetClass?: string;
  deactivated?: boolean;
  targetNode?: string;
  targetObjectsOf?: string; // Skip for now
  targetSubjectsOf?: string; // Skip for now
  message?: string;
  severity?: SEVERITY;
}
