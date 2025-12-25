import { SEVERITY, Shape, SHAPE_TYPE } from './meta-model/shape';
import { CoreConstraints } from './meta-model/core-constraints';
import { match, P } from 'ts-pattern';
import logger from '../logger';
import { NodeKind } from './meta-model/node-kind';
import { AdditionalProperty, ShapeDefinition } from './meta-model/shape-definition';
import type { Term } from 'n3';

export class ShapeDefinitionBuilder {
  private readonly nodeKey: string;
  private shape: Partial<Shape> = {};
  private coreConstraints: Partial<CoreConstraints> = {};
  private dependentShapeDefinitions: ShapeDefinition[] = [];
  private readonly additionalProperties: AdditionalProperty[] = [];

  constructor(
    nodeKey: string,
    private readonly lists: Record<string, Term[]> = {}
  ) {
    this.nodeKey = nodeKey;
  }

  setNode(node: string) {
    this.coreConstraints.node = node;
    return this;
  }

  setType(type: string) {
    match(type)
      .with(P.string.endsWith('NodeShape'), () => (this.shape.type = SHAPE_TYPE.NODE_SHAPE))
      .with(
        P.string.endsWith('PropertyShape'),
        () => (this.shape.type = SHAPE_TYPE.PROPERTY_SHAPE)
      );
    return this;
  }

  setPath(path: string) {
    this.shape.path = path;
    this.shape.type = SHAPE_TYPE.PROPERTY_SHAPE;
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

  setMinCount(count: string) {
    this.coreConstraints.minCount = parseInt(count);
    return this;
  }

  setMaxCount(count: string) {
    this.coreConstraints.maxCount = parseInt(count);
    return this;
  }

  setMinInclusive(count: string) {
    this.coreConstraints.minInclusive = parseInt(count);
    return this;
  }

  setMaxInclusive(count: string) {
    this.coreConstraints.maxInclusive = parseInt(count);
    return this;
  }

  setMinExclusive(count: string) {
    this.coreConstraints.minExclusive = parseInt(count);
    return this;
  }

  setMaxExclusive(count: string) {
    this.coreConstraints.maxExclusive = parseInt(count);
    return this;
  }

  setMinLength(count: string) {
    this.coreConstraints.minLength = parseInt(count);
    return this;
  }

  setMaxLength(count: string) {
    this.coreConstraints.maxLength = parseInt(count);
    return this;
  }

  setQualifiedMinCount(count: string) {
    this.coreConstraints.qualifiedMinCount = parseInt(count);
    return this;
  }

  setQualifiedMaxCount(count: string) {
    this.coreConstraints.qualifiedMaxCount = parseInt(count);
    return this;
  }

  setUniqueLang(flag: string) {
    this.coreConstraints.uniqueLang = flag.endsWith('true');
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

  in(listHeadOrValue: string) {
    this.coreConstraints.in ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue);
    this.coreConstraints.in.push(...values);
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

  setDatatype(datatype: string) {
    this.coreConstraints.datatype = datatype;
    return this;
  }

  setHasValue(flag: string) {
    this.coreConstraints.hasValue = flag.endsWith('true');
    return this;
  }

  setFirst(first: string) {
    this.coreConstraints.first = first;
    return this;
  }

  setRest(rest: string) {
    this.coreConstraints.rest = rest;
    return this;
  }

  setIgnoredProperties(dependentShape: string) {
    this.coreConstraints.ignoredProperties ??= [];
    this.coreConstraints.ignoredProperties.push(dependentShape);
    return this;
  }

  or(listHeadOrValue: string) {
    this.coreConstraints.or ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue);
    this.coreConstraints.or.push(...values);
    return this;
  }

  and(listHeadOrValue: string) {
    this.coreConstraints.and ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue);
    this.coreConstraints.and.push(...values);
    return this;
  }

  not(listHeadOrValue: string) {
    this.coreConstraints.not ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue);
    this.coreConstraints.not.push(...values);
    return this;
  }

  xone(listHeadOrValue: string) {
    this.coreConstraints.xone ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue);
    this.coreConstraints.xone.push(...values);
    return this;
  }

  setLanguageIn(listHeadOrValue: string) {
    this.coreConstraints.languageIn ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue);
    this.coreConstraints.languageIn.push(...values);
    return this;
  }

  setQualifiedValueShape(dependentShape: string) {
    this.coreConstraints.qualifiedValueShape = dependentShape;
    return this;
  }

  /**
   * Extracts values from an RDF list if the identifier is a list head.
   * Otherwise returns the identifier as a single-element array.
   */
  private extractListValues(listHeadOrValue: string): string[] {
    const extractedList = this.lists[listHeadOrValue];
    if (extractedList) {
      // This is a list head - extract all values
      return extractedList.map((term) => term.value);
    }
    // Not a list - return as single value
    return [listHeadOrValue];
  }

  setAdditionalProperty(predicate: string, object: Term) {
    // Extract RDF value information from the N3 term
    let rdfValue: AdditionalProperty['value'];

    if (object.termType === 'Literal') {
      // Type-cast to access Literal-specific properties
      const literal = object as unknown as {
        value: string;
        language?: string;
        datatype: { value: string };
      };

      // Handle language-tagged strings
      if (literal.language) {
        rdfValue = {
          type: 'langString',
          value: literal.value,
          language: literal.language,
        };
      } else {
        rdfValue = {
          type: 'literal',
          value: literal.value,
          datatype: literal.datatype.value,
        };
      }
    } else if (object.termType === 'NamedNode') {
      rdfValue = {
        type: 'uri',
        value: object.value,
      };
    } else {
      // For blank nodes or other types, store as URI
      rdfValue = {
        type: 'uri',
        value: object.value,
      };
    }

    this.additionalProperties.push({
      predicate,
      value: rdfValue,
    });

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
      additionalProperties:
        this.additionalProperties.length > 0 ? this.additionalProperties : undefined,
    };
  }

  setProperty(property: string) {
    this.coreConstraints.property ??= [];
    this.coreConstraints.property.push(property);
    return this;
  }
}
