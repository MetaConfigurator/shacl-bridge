import { DependencyGraph } from './dependency-graph';
import { ShapeDefinition } from './meta-model/shapeDefinition';
import { Quad } from 'n3';
import { SHAPE_TYPE } from './meta-model/shape';
import { match, P } from 'ts-pattern';
import { ShapeDefinitionBuilder } from './shape-definition-builder';
import { TripleIndex } from './indexer';

export class TopologicalShapeBuilder {
  private readonly resolved = new Map<string, ShapeDefinition>();
  private readonly processed = new Set<string>();

  constructor(
    private readonly index: TripleIndex,
    private readonly graph: DependencyGraph
  ) {}

  build(): ShapeDefinition[] {
    const subjectsInDocument = [...this.index.quadsIndex.keys()];

    while (this.processed.size < subjectsInDocument.length) {
      const subjectsThatCanBeProcessed = subjectsInDocument
        .filter((subject) => !this.processed.has(subject))
        .filter((subject) => this.canProcess(subject));

      if (subjectsThatCanBeProcessed.length === 0) {
        throw new Error('Circular dependency detected in SHACL shapes');
      }

      subjectsThatCanBeProcessed.forEach((subject) => {
        this.process(subject);
      });
    }

    return [...this.index.namedShapesIndex].map((name) => {
      const shape = this.resolved.get(name);
      if (!shape) {
        throw new Error(`Named shape '${name}' was not resolved`);
      }
      return shape;
    });
  }

  private canProcess(subject: string): boolean {
    // Every dependencies of the subject should be processed before the current one can be processed.
    const dependenciesOfSubject = this.graph.dependencies.get(subject) ?? new Set();
    return [...dependenciesOfSubject].every((dependency) => this.processed.has(dependency));
  }

  private process(subject: string) {
    if (this.resolved.has(subject)) return;

    const quads = this.index.quadsIndex.get(subject);

    const shapeDefinition = this.buildShapeFromQuads(subject, quads);

    const deps = this.graph.dependencies.get(subject) ?? new Set();
    shapeDefinition.dependentShapes ??= [];
    shapeDefinition.dependentShapes = [...deps].map((dep) => this.resolved.get(dep));

    if (this.index.blankNodesIndex.has(subject)) {
      const parent = this.graph.dependents.get(subject);
      if (parent) {
        // Check if parent references this blank node via sh:property
        const parentQuads = this.index.quadsIndex.get(parent) ?? [];
        const isProperty = parentQuads.some(
          (q) => q.predicate.value.endsWith('property') && q.object.value === subject
        );
        // Override the type if it's a blank node referenced via sh:property and doesn't have an explicit type
        if (isProperty && shapeDefinition.shape?.type === SHAPE_TYPE.NODE_SHAPE) {
          shapeDefinition.shape.type = SHAPE_TYPE.PROPERTY_SHAPE;
        }
      }
    }

    this.resolved.set(subject, shapeDefinition);
    this.processed.add(subject);
  }

  private buildShapeFromQuads(nodeKey: string, quads: Quad[] | undefined): ShapeDefinition {
    const builder = new ShapeDefinitionBuilder(nodeKey);
    quads?.forEach((quad) => {
      const subject = quad.subject.value;
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
          console.log(`Should implement : ${subject} ${predicate} ${object}`);
        });
    });

    return builder.build();
  }
}
