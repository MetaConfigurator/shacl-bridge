import { DependencyGraph } from './dependency-graph';
import { ShapeDefinition } from './meta-model/shape-definition';
import { Quad, Term, Util } from 'n3';
import { SHAPE_TYPE } from './meta-model/shape';
import { match, P } from 'ts-pattern';
import { ShapeDefinitionBuilder } from './shape-definition-builder';
import { Index } from './indexer';
import { ShaclDocument } from '../shacl/shacl-document';
import logger from '../logger';
import { getTarget } from './target-resolver';
import isBlankNode = Util.isBlankNode;

export class ShapeBuilder {
  private readonly resolved = new Map<string, ShapeDefinition>();
  private readonly termCache = new Map<string, Term>();

  constructor(
    private readonly shaclDocument: ShaclDocument,
    private readonly index: Index,
    private readonly graph: DependencyGraph
  ) {
    new Set([...this.graph.dependencies.keys(), ...this.graph.dependents.keys()]).forEach((term) =>
      this.termCache.set(term.value, term)
    );
  }

  build(): ShapeDefinition[] {
    const { quads, shapes } = this.index;

    [...quads.keys()].forEach((subject) => {
      this.buildAndRegisterShape(subject, quads.get(subject) ?? []);
    });

    [...quads.keys()].forEach((subject) => {
      this.resolveDependencies(subject);
    });

    return shapes
      .filter((shapeTerm) => !isBlankNode(shapeTerm))
      .map((shapeTerm) => this.resolved.get(shapeTerm.value))
      .filter((shape) => shape != null);
  }

  private getCanonicalTerm(term: Term): Term {
    return this.termCache.get(term.value) ?? term;
  }

  private buildAndRegisterShape(subject: Term, quads: Quad[]): void {
    if (quads.length === 0) {
      logger.warn(`Shape '${subject.value}' has no quads, skipping.`);
      return;
    }
    const shapeDefinition = this.buildShapeFromQuads(subject.value, quads);
    this.resolved.set(subject.value, shapeDefinition);
  }

  private resolveDependencies(subject: Term): void {
    const canonicalSubject = this.getCanonicalTerm(subject);
    const shapeDefinition = this.resolved.get(subject.value);
    const { dependencies, dependents } = this.graph;
    const { lists } = this.shaclDocument;
    const { quads, blanks } = this.index;
    if (!shapeDefinition) {
      throw new Error(`Shape '${subject.value}' was not created in first pass`);
    }

    shapeDefinition.dependentShapes = [...(dependencies.get(canonicalSubject) ?? new Set())]
      .filter((dep) => !(dep.value in lists))
      .map((dep) => this.resolved.get(dep.value))
      .filter((shape) => shape !== undefined);

    // Handle property shape type override for blank nodes
    const isBlankNode = blanks.some((blank) => blank.value === subject.value);
    if (isBlankNode) {
      const parents = dependents.get(canonicalSubject) ?? new Set();
      for (const parent of parents) {
        // Check if parent references this blank node via sh:property
        const parentQuads = quads.get(parent) ?? [];
        const isProperty = parentQuads.some(
          (q) => q.predicate.value.endsWith('property') && q.object.value === subject.value
        );
        // Override the type if it's a blank node referenced via sh:property and doesn't have an explicit type
        if (isProperty && shapeDefinition.shape?.type === SHAPE_TYPE.NODE_SHAPE) {
          shapeDefinition.shape.type = SHAPE_TYPE.PROPERTY_SHAPE;
          break; // Only need to check once
        }
      }
    }
  }

  private buildShapeFromQuads(nodeKey: string, quads: Quad[]): ShapeDefinition {
    const builder = new ShapeDefinitionBuilder(nodeKey);
    builder.setTargets(getTarget(this.index.targets, nodeKey));

    const lists = this.shaclDocument.lists;
    quads.forEach((quad) => {
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      match(predicate)
        .with(P.string.endsWith('datatype'), () => builder.setDatatype(object))
        .with(P.string.endsWith('type'), () => builder.setType(object))
        .with(P.string.endsWith('property'), () => builder.setProperty(object))
        .with(P.string.endsWith('path'), () => builder.setPath(object))
        .with(P.string.endsWith('targetClass'), () => builder.setTargetClass(object))
        .with(P.string.endsWith('targetNode'), () => builder.setTargetNode(object))
        .with(P.string.endsWith('targetObjectsOf'), () => builder.setTargetObjectsOf(object))
        .with(P.string.endsWith('targetSubjectsOf'), () => builder.setTargetSubjectsOf(object))
        .with(P.string.endsWith('deactivated'), () => builder.setDeactivated(object))
        .with(P.string.endsWith('message'), () => builder.setMessage(object))
        .with(P.string.endsWith('severity'), () => builder.setSeverity(object))
        .with(P.string.endsWith('pattern'), () => builder.setPattern(object))
        .with(P.string.endsWith('class'), () => builder.setClass(object))
        .with(P.string.endsWith('node'), () => builder.setNode(object))
        .with(P.string.endsWith('nodeKind'), () => builder.setNodeKind(object))
        .with(P.string.endsWith('closed'), () => builder.setClosed(object))
        .with(P.string.endsWith('hasValue'), () => builder.setHasValue(object))
        .with(P.string.endsWith('minCount'), () => builder.setMinCount(object))
        .with(P.string.endsWith('maxCount'), () => builder.setMaxCount(object))
        .with(P.string.endsWith('minInclusive'), () => builder.setMinInclusive(object))
        .with(P.string.endsWith('maxInclusive'), () => builder.setMaxInclusive(object))
        .with(P.string.endsWith('minExclusive'), () => builder.setMinExclusive(object))
        .with(P.string.endsWith('maxExclusive'), () => builder.setMaxExclusive(object))
        .with(P.string.endsWith('minLength'), () => builder.setMinLength(object))
        .with(P.string.endsWith('maxLength'), () => builder.setMaxLength(object))
        .with(P.string.endsWith('qualifiedMinCount'), () => builder.setQualifiedMinCount(object))
        .with(P.string.endsWith('qualifiedMaxCount'), () => builder.setQualifiedMaxCount(object))
        .with(P.string.endsWith('uniqueLang'), () => builder.setUniqueLang(object))
        .with(P.string.endsWith('first'), () => builder.setFirst(object))
        .with(P.string.endsWith('rest'), () => builder.setRest(object))
        .with(P.string.endsWith('ignoredProperties'), () => builder.setIgnoredProperties(object))
        .with(P.string.endsWith('in'), () => builder.in(object, lists))
        .with(P.string.endsWith('and'), () => builder.and(object, lists))
        .with(P.string.endsWith('or'), () => builder.or(object, lists))
        .with(P.string.endsWith('not'), () => builder.not(object, lists))
        .with(P.string.endsWith('xone'), () => builder.xone(object, lists))
        .with(P.string.endsWith('qualifiedValueShape'), () =>
          builder.setQualifiedValueShape(object)
        )
        .with(P.string.endsWith('languageIn'), () => builder.setLanguageIn(object, lists))
        .with(P.string.endsWith('equals'), () => builder.setEquals(object))
        .with(P.string.endsWith('lessThan'), () => builder.setLessThan(object))
        .with(P.string.endsWith('defaultValue'), () => builder.setDefaultValue(object))
        .with(P.string.endsWith('lessThanOrEquals'), () => builder.setLessThanOrEquals(object))
        .with(P.string.endsWith('disjoint'), () => builder.setDisjoint(object, lists))
        .otherwise(() => {
          // Capture non-SHACL predicates as additional properties
          builder.setAdditionalProperty(predicate, quad.object);
        });
    });

    return builder.build();
  }
}
