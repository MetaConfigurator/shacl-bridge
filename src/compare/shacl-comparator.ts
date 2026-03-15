import { ShaclParser } from '../shacl/parser/shacl-parser';
import { canonicalizeStore } from './rdf-canonicalizer';
import { computeDiff } from './triple-diff';
import { ComparisonResult, TripleDiff } from './types';

function extractSubject(nquad: string): string {
  const trimmed = nquad.trimStart();
  if (trimmed.startsWith('<')) {
    return trimmed.slice(1, trimmed.indexOf('>'));
  }
  if (trimmed.startsWith('_:')) {
    const end = trimmed.indexOf(' ');
    return trimmed.slice(0, end === -1 ? undefined : end);
  }
  return trimmed;
}

function groupBySubject(triples: Set<string>): TripleDiff[] {
  const groups = new Map<string, string[]>();
  for (const triple of triples) {
    const subject = extractSubject(triple);
    if (!groups.has(subject)) groups.set(subject, []);
    groups.get(subject)?.push(triple);
  }
  return [...groups.entries()].map(([subject, ts]) => ({ subject, triples: ts }));
}

export class ShaclComparator {
  constructor(
    private readonly file1: string,
    private readonly file2: string
  ) {}

  async compare(): Promise<ComparisonResult> {
    const [doc1, doc2] = await Promise.all([
      new ShaclParser().withPath(this.file1).parse(),
      new ShaclParser().withPath(this.file2).parse(),
    ]);

    const [set1, set2] = await Promise.all([
      canonicalizeStore(doc1.store),
      canonicalizeStore(doc2.store),
    ]);

    const { onlyInA, onlyInB, score } = computeDiff(set1, set2);

    return {
      score,
      onlyInFile1: groupBySubject(onlyInA),
      onlyInFile2: groupBySubject(onlyInB),
    };
  }
}
