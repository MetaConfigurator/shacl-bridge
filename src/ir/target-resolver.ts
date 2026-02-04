import { Quad, Quad_Subject, Term, Util } from 'n3';
import {
  SHACL_PATH,
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_TARGET_SUBJECTS_OF,
} from '../shacl/shacl-terms';
import { extractStrippedName } from '../util/helpers';
import { ShaclDocument } from '../shacl/shacl-document';
import isBlankNode = Util.isBlankNode;

const TARGET_DEFINITIONS = [
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_SUBJECTS_OF,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_PATH,
];

export function getTarget(targets: Map<Term, string[]>, search: string) {
  return [...targets.entries()]
    .filter(([key]) => key.value === search)
    .map(([, val]) => val)
    .flat(1);
}

export class TargetResolver {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  resolveTargets(quads: Map<Term, Quad[]>): Map<Term, string[]> {
    const targets = new Map<Term, string[]>();
    quads.forEach((quadsForShape, shape) =>
      targets.set(
        shape,
        this.findTheBestTargetDeclarations(
          this.getTargetDeclarations(quads, shape) ?? [],
          shape as Quad_Subject
        )
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

  private findTheBestTargetDeclarations(
    targetDeclarations: { predicate: string; object: string }[],
    subject: Quad_Subject
  ): string[] {
    if (isBlankNode(subject)) {
      return targetDeclarations
        .filter((target) => target.predicate === SHACL_PATH)
        .map((target) => target.object)
        .map(extractStrippedName);
    }

    const targetClasses = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_CLASS)
      .map((target) => target.object)
      .map(extractStrippedName);

    const targetNodes = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_NODE)
      .map((target) => target.object)
      .map(extractStrippedName);

    const targetSubjects = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_SUBJECTS_OF)
      .map((target) => target.object)
      .map((predicate) =>
        this.shaclDocument.store.getQuads(null, predicate, null, this.shaclDocument.graphId)
      )
      .flat(1)
      .map((quad) => quad.subject.value)
      .map(extractStrippedName);

    const targetObjects = targetDeclarations
      .filter((target) => target.predicate === SHACL_TARGET_OBJECTS_OF)
      .map((target) => target.object)
      .map((predicate) =>
        this.shaclDocument.store.getQuads(null, predicate, null, this.shaclDocument.graphId)
      )
      .flat(1)
      .map((quad) => quad.object.value)
      .map(extractStrippedName);

    const noTargets = [targetSubjects, targetObjects, targetClasses, targetNodes].every(
      (arr) => arr.length === 0
    );

    return noTargets
      ? [extractStrippedName(subject.value)]
      : [...new Set([...targetClasses, ...targetNodes, ...targetSubjects, ...targetObjects])];
  }
}
