import { DependencyGraph } from './dependency-graph';
import { ShapeDefinition } from './meta-model/shape-definition';
import { Quad } from 'n3';
import { SHAPE_TYPE } from './meta-model/shape';
import { match, P } from 'ts-pattern';
import { ShapeDefinitionBuilder } from './shape-definition-builder';
import { TripleIndex } from './indexer';

export class ShapeBuilder {
  private readonly resolved = new Map<string, ShapeDefinition>();

  constructor(
    private readonly index: TripleIndex,
    private readonly graph: DependencyGraph
  ) {}

  build(): ShapeDefinition[] {
    const subjectsInDocument = [...this.index.quadsIndex.keys()];

    // First pass: Create all ShapeDefinitions without resolving dependencies
    subjectsInDocument.forEach((subject) => {
      this.buildAndRegisterShape(subject);
    });

    // Second pass: Resolve dependencies for all shapes
    subjectsInDocument.forEach((subject) => {
      this.resolveDependencies(subject);
    });

    return [...this.index.namedShapesIndex].map((name) => {
      const shape = this.resolved.get(name);
      if (!shape) {
        throw new Error(`Named shape '${name}' was not resolved`);
      }
      return shape;
    });
  }

  private buildAndRegisterShape(subject: string): void {
    const quads = this.index.quadsIndex.get(subject);
    const shapeDefinition = this.buildShapeFromQuads(subject, quads);
    this.resolved.set(subject, shapeDefinition);
  }

  private resolveDependencies(subject: string): void {
    const shapeDefinition = this.resolved.get(subject);
    if (!shapeDefinition) {
      throw new Error(`Shape '${subject}' was not created in first pass`);
    }

    // Resolve dependent shapes
    const deps = this.graph.dependencies.get(subject) ?? new Set();
    shapeDefinition.dependentShapes = [...deps].map((name) => {
      const shape = this.resolved.get(name);
      if (!shape) {
        throw new Error(`Dependent shape '${name}' was not resolved`);
      }
      return shape;
    });

    // Handle property shape type override for blank nodes
    if (this.index.blankNodesIndex.has(subject)) {
      const parents = this.graph.dependents.get(subject) ?? new Set<string>();
      for (const parent of parents) {
        // Check if parent references this blank node via sh:property
        const parentQuads = this.index.quadsIndex.get(parent) ?? [];
        const isProperty = parentQuads.some(
          (q) => q.predicate.value.endsWith('property') && q.object.value === subject
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
    const builder = new ShapeDefinitionBuilder(nodeKey);
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
