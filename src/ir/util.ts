import { BlankNode, Quad_Subject, Term, Util } from 'n3';
import { ShaclDocument } from '../shacl/shacl-document';
import {
  RDF_TYPE,
  SHACL_NODE_SHAPE,
  SHACL_PATH,
  SHACL_PROPERTY_SHAPE,
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_TARGET_SUBJECTS_OF,
} from '../shacl/shacl-terms';
import isBlankNode = Util.isBlankNode;

const SHAPE_TARGET_PREDICATES = [
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_TARGET_SUBJECTS_OF,
  SHACL_TARGET_OBJECTS_OF,
  SHACL_PATH,
];

export function getQuads(shaclDocument: ShaclDocument) {
  const { subjects, store, graphId } = shaclDocument;
  return new Map(
    subjects.map((subject) => [subject, store.getQuads(subject, null, null, graphId)])
  );
}

export function getBlankNodes(subjects: Term[]): BlankNode[] {
  return [...new Set(subjects.filter((subject) => isBlankNode(subject)))];
}

export function getShapes(shaclDocument: ShaclDocument): Quad_Subject[] {
  const { store, graphId, subjects } = shaclDocument;
  const shapeValues = new Set<string>();
  store.getSubjects(RDF_TYPE, SHACL_NODE_SHAPE, graphId).forEach((s) => shapeValues.add(s.value));
  store
    .getSubjects(RDF_TYPE, SHACL_PROPERTY_SHAPE, graphId)
    .forEach((s) => shapeValues.add(s.value));
  SHAPE_TARGET_PREDICATES.map((predicate) => store.getSubjects(predicate, null, graphId))
    .flatMap((subjects) => [...subjects])
    .forEach((subject) => shapeValues.add(subject.value));
  return subjects
    .filter((s) => !isBlankNode(s))
    .filter((s) => shapeValues.has(s.value)) as Quad_Subject[];
}
