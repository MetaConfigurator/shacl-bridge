import { SEVERITY, Shape, SHAPE_TYPE } from './meta-model/shape';
import { CoreConstraints } from './meta-model/core-constraints';
import { match, P } from 'ts-pattern';
import logger from '../logger';
import { NodeKind } from './meta-model/node-kind';
import { AdditionalProperty, ShapeDefinition } from './meta-model/shape-definition';
import type { Term } from 'n3';
import { SparqlConstraint } from './meta-model/sparql-constraint';

export class ShapeDefinitionBuilder {
  private readonly nodeKey: string;
  private targets: string[] = [];
  private shape: Partial<Shape> = {};
  private coreConstraints: Partial<CoreConstraints> = {};
  private dependentShapeDefinitions: ShapeDefinition[] = [];
  private readonly additionalProperties: AdditionalProperty[] = [];
  private sparqlConstraintBlankNodes: string[] = [];
  private currentSparqlConstraint: Partial<SparqlConstraint> = {};
  private isSparqlConstraintNode = false;

  constructor(nodeKey: string) {
    this.nodeKey = nodeKey;
  }

  setNode(node: string) {
    this.coreConstraints.node = node;
    return this;
  }

  setTargets(targets: string[]) {
    this.targets = targets;
    return this;
  }

  setType(type: string) {
    match(type)
      .with(P.string.endsWith('NodeShape'), () => (this.shape.type = SHAPE_TYPE.NODE_SHAPE))
      .with(P.string.endsWith('PropertyShape'), () => (this.shape.type = SHAPE_TYPE.PROPERTY_SHAPE))
      .otherwise(() => {
        this.shape.rdfTypes ??= [];
        this.shape.rdfTypes.push(type);
      });
    return this;
  }

  setPath(path: string) {
    this.shape.path = path;
    this.shape.type = SHAPE_TYPE.PROPERTY_SHAPE;
    return this;
  }

  setTargetClass(target: string) {
    this.shape.targetClasses ??= [];
    this.shape.targetClasses.push(target);
    return this;
  }

  setDeactivated(flag: string) {
    this.shape.deactivated = flag.endsWith('true');
    return this;
  }

  setTargetNode(node: string) {
    this.shape.targetNodes ??= [];
    this.shape.targetNodes.push(node);
    return this;
  }

  setTargetObjectsOf(predicate: string) {
    this.shape.targetObjectsOf ??= [];
    this.shape.targetObjectsOf.push(predicate);
    return this;
  }

  setTargetSubjectsOf(predicate: string) {
    this.shape.targetSubjectsOf ??= [];
    this.shape.targetSubjectsOf.push(predicate);
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
    this.coreConstraints.minInclusive = parseFloat(count);
    return this;
  }

  setMaxInclusive(count: string) {
    this.coreConstraints.maxInclusive = parseFloat(count);
    return this;
  }

  setMinExclusive(count: string) {
    this.coreConstraints.minExclusive = parseFloat(count);
    return this;
  }

  setMaxExclusive(count: string) {
    this.coreConstraints.maxExclusive = parseFloat(count);
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

  in(listHeadOrValue: string, lists: Record<string, Term[]>) {
    this.coreConstraints.in ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue, lists);
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

  setHasValue(value: string) {
    // sh:hasValue can be any value (string, number, URI, etc.)
    // Store the value as-is, not as a boolean
    if (value === 'true' || value === 'false') this.coreConstraints.hasValue = value === 'true';
    else if (!isNaN(Number(value))) this.coreConstraints.hasValue = Number(value);
    else this.coreConstraints.hasValue = value;
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

  setIgnoredProperties(property: string, lists: Record<string, Term[]>) {
    this.coreConstraints.ignoredProperties ??= [];
    // Check if this is a list or a single value
    if (property in lists) {
      // Extract values from RDF list if this is a list head
      const values = this.extractListValues(property, lists);
      this.coreConstraints.ignoredProperties.push(...values);
    } else {
      // Single property value
      this.coreConstraints.ignoredProperties.push(property);
    }
    return this;
  }

  or(listHeadOrValue: string, lists: Record<string, Term[]>) {
    this.coreConstraints.or ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue, lists);
    this.coreConstraints.or.push(...values);
    return this;
  }

  and(listHeadOrValue: string, lists: Record<string, Term[]>) {
    this.coreConstraints.and ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue, lists);
    this.coreConstraints.and.push(...values);
    return this;
  }

  not(listHeadOrValue: string, lists: Record<string, Term[]>) {
    this.coreConstraints.not ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue, lists);
    this.coreConstraints.not.push(...values);
    return this;
  }

  xone(listHeadOrValue: string, lists: Record<string, Term[]>) {
    this.coreConstraints.xone ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue, lists);
    this.coreConstraints.xone.push(...values);
    return this;
  }

  setLanguageIn(listHeadOrValue: string, lists: Record<string, Term[]>) {
    this.coreConstraints.languageIn ??= [];
    // Extract values from RDF list if this is a list head
    const values = this.extractListValues(listHeadOrValue, lists);
    this.coreConstraints.languageIn.push(...values);
    return this;
  }

  setQualifiedValueShape(dependentShape: string) {
    this.coreConstraints.qualifiedValueShape = dependentShape;
    return this;
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

    // If this is a SPARQL constraint node, add the constraint to coreConstraints
    if (this.isSparqlConstraintNode && Object.keys(this.currentSparqlConstraint).length > 0) {
      this.coreConstraints.sparqlConstraints ??= [];
      this.coreConstraints.sparqlConstraints.push(this.currentSparqlConstraint as SparqlConstraint);
    }

    return {
      nodeKey: this.nodeKey,
      targets: this.targets,
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

  setEquals(property: string) {
    this.coreConstraints.equals = property;
    return this;
  }

  setLessThan(property: string) {
    this.coreConstraints.lessThan = property;
    return this;
  }

  setLessThanOrEquals(property: string) {
    this.coreConstraints.lessThanOrEquals = property;
    return this;
  }

  setDisjoint(property: string, lists: Record<string, Term[]>) {
    this.coreConstraints.disjoint ??= [];
    // Check if this is a list or a single value
    if (property in lists) {
      // Extract values from RDF list if this is a list head
      const values = this.extractListValues(property, lists);
      this.coreConstraints.disjoint.push(...values);
    } else {
      // Single property value
      this.coreConstraints.disjoint.push(property);
    }
    return this;
  }

  setDefaultValue(value: string) {
    this.coreConstraints.defaultValue = value;
    return this;
  }

  setOrder(value: string) {
    this.coreConstraints.order = isNaN(Number(value)) ? value : Number(value);
    return this;
  }

  setFlags(flags: string) {
    this.coreConstraints.flags = flags;
    return this;
  }

  // SPARQL constraint methods
  setSparqlConstraint(blankNodeId: string) {
    // Track blank node that contains SPARQL constraint
    this.sparqlConstraintBlankNodes.push(blankNodeId);
    return this;
  }

  markAsSparqlConstraintNode() {
    // Mark this builder as constructing a SPARQL constraint node
    this.isSparqlConstraintNode = true;
    return this;
  }

  setSparqlMessage(message: string) {
    if (this.isSparqlConstraintNode) {
      this.currentSparqlConstraint.message = message;
    }
    return this;
  }

  setSparqlSelect(query: string) {
    if (this.isSparqlConstraintNode) {
      this.currentSparqlConstraint.select = query;
    }
    return this;
  }

  setSparqlAsk(query: string) {
    if (this.isSparqlConstraintNode) {
      this.currentSparqlConstraint.ask = query;
    }
    return this;
  }

  buildSparqlConstraint(): SparqlConstraint | null {
    if (!this.isSparqlConstraintNode) {
      return null;
    }
    return this.currentSparqlConstraint as SparqlConstraint;
  }

  addSparqlConstraint(constraint: SparqlConstraint) {
    this.coreConstraints.sparqlConstraints ??= [];
    this.coreConstraints.sparqlConstraints.push(constraint);
    return this;
  }

  getSparqlConstraintBlankNodes(): string[] {
    return this.sparqlConstraintBlankNodes;
  }

  /**
   * Extracts values from an RDF list if the identifier is a list head.
   * Otherwise returns the identifier as a single-element array.
   */
  private extractListValues(listHeadOrValue: string, lists: Record<string, Term[]>): string[] {
    if (listHeadOrValue in lists) {
      // This is a list head - extract all values
      return lists[listHeadOrValue].map((term) => term.value);
    }
    // Not a list - return as single value
    return [listHeadOrValue];
  }
}
