import { BlankNode, Quad_Subject, Term, Util } from 'n3';
import { ShaclDocument } from '../shacl/shacl-document';
import isBlankNode = Util.isBlankNode;

export function getQuads(shaclDocument: ShaclDocument) {
  const { subjects, store, graphId } = shaclDocument;
  return new Map(
    subjects.map((subject) => [subject, store.getQuads(subject, null, null, graphId)])
  );
}

export function getBlankNodes(subjects: Term[]): BlankNode[] {
  return [...new Set(subjects.filter((subject) => isBlankNode(subject)))];
}

export function getShapes(subjects: Term[]): Quad_Subject[] {
  return [...new Set(subjects.filter((subject) => !isBlankNode(subject)))] as Quad_Subject[];
}
