import { SEVERITY, Shape, SHAPE_TYPE } from './meta-model/shape';
import { CoreConstraints } from './meta-model/core-constraints';
import { match, P } from 'ts-pattern';
import logger from '../logger';
import { NodeKind } from './meta-model/nodeKind';
import { ShapeDefinition } from './meta-model/shapeDefinition';

export class ShapeDefinitionBuilder {
  private readonly nodeKey: string;
  private shape: Partial<Shape> = {};
  private coreConstraints: Partial<CoreConstraints> = {};
  private dependentShapeDefinitions: ShapeDefinition[] = [];

  constructor(nodeKey: string) {
    this.nodeKey = nodeKey;
  }

  setType(type: string) {
    match(type)
      .with(P.string.endsWith('NodeShape'), () => (this.shape.type = SHAPE_TYPE.NODE_SHAPE))
      .with(P.string.endsWith('PropertyShape'), () => (this.shape.type = SHAPE_TYPE.PROPERTY_SHAPE))
      .with(P.string.endsWith('path'), () => (this.shape.type = SHAPE_TYPE.PROPERTY_SHAPE));
    return this;
  }

  setPath(path: string) {
    this.shape.path = path;
    return this;
  }

  setTargetClass(target: string) {
    this.shape.targetClass = target;
    return this;
  }

  setDeactivated(flag: string) {
    this.shape.deactivated = flag.endsWith('true');
    return this;
  }

  setTargetNode(node: string) {
    this.shape.targetNode = node;
    return this;
  }

  setMessage(msg: string) {
    this.shape.message = msg;
    return this;
  }

  setSeverity(severity: string) {
    match(severity)
      .with(P.string.endsWith('Violation'), () => (this.shape.severity = SEVERITY.VIOLATION))
      .with(P.string.endsWith('Info'), () => (this.shape.severity = SEVERITY.INFO))
      .with(P.string.endsWith('Warning'), () => (this.shape.severity = SEVERITY.WARNING))
      .otherwise(() => {
        logger.error(`Could not find a match for severity ${severity}`);
      });
    return this;
  }

  setMaxCount(count: string) {
    this.coreConstraints.maxCount = parseInt(count);
    return this;
  }

  setMinCount(count: string) {
    this.coreConstraints.maxCount = parseInt(count);
    return this;
  }

  setPattern(pattern: string) {
    this.coreConstraints.pattern = pattern;
    return this;
  }

  setClass(clazz: string) {
    this.coreConstraints.class = clazz;
    return this;
  }

  setNodeKind(nodeKind: string) {
    match(nodeKind)
      .with(
        P.string.endsWith('BlankNode'),
        () => (this.coreConstraints.nodeKind = NodeKind.BLANK_NODE)
      )
      .with(
        P.string.endsWith('BlankNodeOrIRI'),
        () => (this.coreConstraints.nodeKind = NodeKind.BLANK_NODE_OR_IRI)
      )
      .with(
        P.string.endsWith('BlankNodeOrLiteral'),
        () => (this.coreConstraints.nodeKind = NodeKind.BLANK_NODE_OR_LITERAL)
      )
      .with(P.string.endsWith('IRI'), () => (this.coreConstraints.nodeKind = NodeKind.IRI))
      .with(
        P.string.endsWith('IRIOrLiteral'),
        () => (this.coreConstraints.nodeKind = NodeKind.IRI_OR_LITERAL)
      )
      .with(P.string.endsWith('Literal'), () => (this.coreConstraints.nodeKind = NodeKind.LITERAL));
    return this;
  }

  setClosed(flag: string) {
    this.coreConstraints.closed = flag.endsWith('true');
    return this;
  }

  setDependentShapeDefinition(shapeDefinition: ShapeDefinition) {
    this.dependentShapeDefinitions.push(shapeDefinition);
    return this;
  }

  build(): ShapeDefinition {
    // Default if not found yet
    this.shape.type ??= SHAPE_TYPE.NODE_SHAPE;

    return {
      nodeKey: this.nodeKey,
      shape: this.shape as Shape,
      coreConstraints: this.coreConstraints as CoreConstraints,
      dependentShapes: this.dependentShapeDefinitions,
    };
  }
}
