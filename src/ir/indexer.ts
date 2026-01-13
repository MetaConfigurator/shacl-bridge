import { BlankNode, Quad, Quad_Subject, Term } from 'n3';
import { ShaclDocument } from '../shacl/shacl-document';
import { getBlankNodes, getQuads, getShapes } from './util';
import { TargetResolver } from './target-resolver';

export interface Index {
  quads: Map<Term, Quad[]>;
  blanks: BlankNode[];
  shapes: Quad_Subject[];
  targets: Map<Term, string[]>;
}

export class Indexer {
  private targetResolver: TargetResolver;

  constructor(private readonly shaclDocument: ShaclDocument) {
    this.targetResolver = new TargetResolver(shaclDocument);
  }

  build(): Index {
    const quads = getQuads(this.shaclDocument);
    const shapes = getShapes(this.shaclDocument.subjects);
    const targets = this.targetResolver.resolveTargets(quads);
    return {
      quads: quads,
      blanks: getBlankNodes(this.shaclDocument.subjects),
      shapes: shapes,
      targets: targets,
    };
  }
}
