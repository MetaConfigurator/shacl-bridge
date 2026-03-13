import { DataFactory, Quad, Quad_Subject, Term, Util } from 'n3';
import {
  RDF_FIRST,
  SHACL_ALTERNATIVE_PATH,
  SHACL_CLASS,
  SHACL_INVERSE_PATH,
  SHACL_ONE_OR_MORE_PATH,
  SHACL_PATH,
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_TARGET_SUBJECTS_OF,
  SHACL_ZERO_OR_MORE_PATH,
  SHACL_ZERO_OR_ONE_PATH,
} from '../shacl/shacl-terms';
import { extractStrippedName } from '../util/helpers';
import { ShaclDocument } from '../shacl/shacl-document';
import isBlankNode = Util.isBlankNode;

const WRAPPED_PATH_PREDICATES = [
  SHACL_ZERO_OR_MORE_PATH,
  SHACL_ONE_OR_MORE_PATH,
  SHACL_ZERO_OR_ONE_PATH,
  SHACL_INVERSE_PATH,
];

const TARGET_DEFINITIONS = [
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_SUBJECTS_OF,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_PATH,
  SHACL_CLASS,
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
    quads.forEach((_quadsForShape, shape) =>
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
      .map((quad) => ({
        predicate: quad.predicate.value,
        object: quad.object.value,
        objectTerm: quad.object,
      }));
  }

  private findTheBestTargetDeclarations(
    targetDeclarations: { predicate: string; object: string; objectTerm: Term }[],
    subject: Quad_Subject
  ): string[] {
    if (isBlankNode(subject) && this.isComplexPathNode(subject)) return [];

    const targetClasses = targetDeclarations
      .filter((t) => t.predicate === SHACL_TARGET_CLASS)
      .map((t) => extractStrippedName(t.object));

    const targetNodes = targetDeclarations
      .filter((t) => t.predicate === SHACL_TARGET_NODE)
      .map((t) => extractStrippedName(t.object));

    const targetSubjects = targetDeclarations
      .filter((t) => t.predicate === SHACL_TARGET_SUBJECTS_OF)
      .flatMap((t) =>
        this.shaclDocument.store.getQuads(null, t.object, null, this.shaclDocument.graphId)
      )
      .map((quad) => extractStrippedName(quad.subject.value));

    const targetObjects = targetDeclarations
      .filter((t) => t.predicate === SHACL_TARGET_OBJECTS_OF)
      .flatMap((t) =>
        this.shaclDocument.store.getQuads(null, t.object, null, this.shaclDocument.graphId)
      )
      .map((quad) => extractStrippedName(quad.object.value));

    const targetPaths = targetDeclarations
      .filter((t) => t.predicate === SHACL_PATH)
      .map((t) =>
        isBlankNode(t.objectTerm)
          ? this.resolveComplexPathName(t.object)
          : extractStrippedName(t.object)
      );

    const classes = targetDeclarations
      .filter((t) => t.predicate === SHACL_CLASS)
      .map((t) => extractStrippedName(t.object));

    const allTargets = [
      ...targetClasses,
      ...targetNodes,
      ...targetSubjects,
      ...targetObjects,
      ...targetPaths,
      ...classes,
    ];

    return allTargets.length > 0 ? [...new Set(allTargets)] : [extractStrippedName(subject.value)];
  }

  private resolveComplexPathName(blankNodeId: string): string {
    const { store, graphId, lists } = this.shaclDocument;
    const blankTerm = DataFactory.blankNode(blankNodeId);

    // Sequence path: blank node is an RDF list head
    if (blankNodeId in lists) {
      const items = lists[blankNodeId];
      if (items.length > 0) return extractStrippedName(items[items.length - 1].value);
    }

    // Wrapped path predicates (zeroOrMorePath, oneOrMorePath, etc.)
    const pathQuads = store.getQuads(blankTerm, null, null, graphId);
    for (const quad of pathQuads) {
      if (WRAPPED_PATH_PREDICATES.includes(quad.predicate.value)) {
        return extractStrippedName(quad.object.value);
      }
      if (quad.predicate.value === SHACL_ALTERNATIVE_PATH) {
        const alts = lists[quad.object.value];
        if (alts[0]) return extractStrippedName(alts[0].value);
      }
    }

    return extractStrippedName(blankNodeId);
  }

  private isComplexPathNode(subject: Quad_Subject): boolean {
    const { store, graphId, lists } = this.shaclDocument;

    if (subject.value in lists) return true;

    const pathQuads = store.getQuads(subject, null, null, graphId);
    return pathQuads.some(
      (q) =>
        WRAPPED_PATH_PREDICATES.includes(q.predicate.value) ||
        q.predicate.value === SHACL_ALTERNATIVE_PATH ||
        q.predicate.value === RDF_FIRST
    );
  }
}
