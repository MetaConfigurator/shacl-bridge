import { Quad, Quad_Subject, Term } from 'n3';
import {
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_TARGET_SUBJECTS_OF,
} from '../util/rdf-terms';
import { extractName } from '../util/helpers';
import { ShaclDocument } from '../shacl/shacl-document';

const TARGET_DEFINITIONS = [
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_SUBJECTS_OF,
  SHACL_TARGET_OBJECTS_OF,
];

export class TargetResolver {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  resolveTargets(shapes: Quad_Subject[], quads: Map<Term, Quad[]>): Map<Term, string[]> {
    const targets = new Map<Term, string[]>();
    shapes.forEach((shape) =>
      targets.set(
        shape,
        this.findTheBestTargetDeclarations(this.getTargetDeclarations(quads, shape) ?? [], shape)
      )
    );
    return targets;
  }

  private getTargetDeclarations(quads: Map<Term, Quad[]>, shape: Term) {
    return quads
      .get(shape)
      ?.filter((quad) => TARGET_DEFINITIONS.includes(quad.predicate.value))
      .map((quad) => {
        return { predicate: quad.predicate.value, object: quad.object.value };
      });
  }

  private stripShape(name: string) {
    if (name.endsWith('Shape') || name.endsWith('shape')) {
      const withOutShape = name.replace(/Shape|shape$/g, '');
      if (withOutShape !== '') return withOutShape;
    }
    return name;
  }

  private findTheBestTargetDeclarations(
    targetDeclarations: { predicate: string; object: string }[],
    subject: Quad_Subject
  ): string[] {
    const targetClasses = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_CLASS)
      .map((target) => target.object)
      .map(extractName);

    const targetNodes = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_NODE)
      .map((target) => target.object)
      .map(extractName);

    const targetSubjects = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_SUBJECTS_OF)
      .map((target) => target.object)
      .map((predicate) =>
        this.shaclDocument.store.getQuads(null, predicate, null, this.shaclDocument.graphId)
      )
      .flat(1)
      .map((quad) => quad.subject.value)
      .map(extractName);

    const targetObjects = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_OBJECTS_OF)
      .map((target) => target.object)
      .map((predicate) =>
        this.shaclDocument.store.getQuads(null, predicate, null, this.shaclDocument.graphId)
      )
      .flat(1)
      .map((quad) => quad.object.value)
      .map(extractName);

    const noTargets = [targetSubjects, targetObjects, targetClasses, targetNodes].every(
      (arr) => arr.length === 0
    );

    return noTargets
      ? [this.stripShape(extractName(subject.value))]
      : [...new Set([...targetClasses, ...targetNodes, ...targetSubjects, ...targetObjects])];
  }
}
