import { DependencyGraph } from './dependency-graph';
import { ShapeDefinition } from './meta-model/shape-definition';
import { Quad, Term, Util } from 'n3';
import { SHAPE_TYPE } from './meta-model/shape';
import { match, P } from 'ts-pattern';
import { ShapeDefinitionBuilder } from './shape-definition-builder';
import { Index } from './indexer';
import { ShaclDocument } from '../shacl/shacl-document';
import isBlankNode = Util.isBlankNode;

export class ShapeBuilder {
  private readonly resolved = new Map<string, ShapeDefinition>();
  private readonly termCache = new Map<string, Term>();

  constructor(
    private readonly shaclDocument: ShaclDocument,
    private readonly index: Index,
    private readonly graph: DependencyGraph
  ) {
    // Build term cache from graph keys (canonical terms)
    for (const term of this.graph.dependencies.keys()) {
      this.termCache.set(term.value, term);
    }
    for (const term of this.graph.dependents.keys()) {
      this.termCache.set(term.value, term);
    }
  }

  build(): ShapeDefinition[] {
    const subjectsInDocument = [...this.index.quads.keys()];

    // First pass: Create all ShapeDefinitions without resolving dependencies
    subjectsInDocument.forEach((subject) => {
      this.buildAndRegisterShape(subject);
    });

    // Second pass: Resolve dependencies for all shapes
    subjectsInDocument.forEach((subject) => {
      this.resolveDependencies(subject);
    });

    // Return only named shapes (non-blank nodes)
    // Blank node shapes appear as dependentShapes of their parent shapes
    return this.index.shapes
      .filter((shapeTerm) => !isBlankNode(shapeTerm))
      .map((shapeTerm) => {
        const shape = this.resolved.get(shapeTerm.value);
        if (!shape) {
          throw new Error(`Named shape '${shapeTerm.value}' was not resolved`);
        }
        return shape;
      });
  }

  private getCanonicalTerm(term: Term): Term {
    return this.termCache.get(term.value) ?? term;
  }

  private buildAndRegisterShape(subject: Term): void {
    const quads = this.index.quads.get(subject);
    const shapeDefinition = this.buildShapeFromQuads(subject.value, quads);
    this.resolved.set(subject.value, shapeDefinition);
  }

  private resolveDependencies(subject: Term): void {
    const canonicalSubject = this.getCanonicalTerm(subject);
    const shapeDefinition = this.resolved.get(subject.value);
    if (!shapeDefinition) {
      throw new Error(`Shape '${subject.value}' was not created in first pass`);
    }

    // Resolve dependent shapes (excluding RDF list nodes)
    const deps = this.graph.dependencies.get(canonicalSubject) ?? new Set();
    shapeDefinition.dependentShapes = [...deps]
      .filter((depTerm) => {
        // Exclude RDF list nodes from dependent shapes
        return !(depTerm.value in this.shaclDocument.lists);
      })
      .map((depTerm) => {
        const shape = this.resolved.get(depTerm.value);
        if (!shape) {
          throw new Error(`Dependent shape '${depTerm.value}' was not resolved`);
        }
        return shape;
      });

    // Handle property shape type override for blank nodes
    const isBlankNode = this.index.blanks.some((blank) => blank.value === subject.value);
    if (isBlankNode) {
      const parents = this.graph.dependents.get(canonicalSubject) ?? new Set();
      for (const parent of parents) {
        // Check if parent references this blank node via sh:property
        const parentQuads = this.index.quads.get(parent) ?? [];
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

  private buildShapeFromQuads(nodeKey: string, quads: Quad[] | undefined): ShapeDefinition {
    const builder = new ShapeDefinitionBuilder(nodeKey, this.shaclDocument.lists);
    quads?.forEach((quad) => {
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      match(predicate)
        .with(P.string.endsWith('datatype'), () => builder.setDatatype(object))
        .with(P.string.endsWith('type'), () => builder.setType(object))
        .with(P.string.endsWith('property'), () => builder.setProperty(object))
        .with(P.string.endsWith('path'), () => builder.setPath(object))
        .with(P.string.endsWith('targetClass'), () => builder.setTargetClass(object))
        .with(P.string.endsWith('deactivated'), () => builder.setDeactivated(object))
        .with(P.string.endsWith('targetNode'), () => builder.setTargetNode(object))
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
        .with(P.string.endsWith('in'), () => builder.in(object))
        .with(P.string.endsWith('and'), () => builder.and(object))
        .with(P.string.endsWith('or'), () => builder.or(object))
        .with(P.string.endsWith('not'), () => builder.not(object))
        .with(P.string.endsWith('xone'), () => builder.xone(object))
        .with(P.string.endsWith('qualifiedValueShape'), () =>
          builder.setQualifiedValueShape(object)
        )
        .with(P.string.endsWith('languageIn'), () => builder.setLanguageIn(object))
        .otherwise(() => {
          // Capture non-SHACL predicates as additional properties
          builder.setAdditionalProperty(predicate, quad.object);
        });
    });

    return builder.build();
  }
}
