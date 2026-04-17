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
    private readonly expected: string,
    private readonly actual: string
  ) {}

  async compare(): Promise<ComparisonResult> {
    const [docExpected, docActual] = await Promise.all([
      new ShaclParser().withPath(this.expected).parse(),
      new ShaclParser().withPath(this.actual).parse(),
    ]);

    const [setExpected, setActual] = await Promise.all([
      canonicalizeStore(docExpected.store),
      canonicalizeStore(docActual.store),
    ]);

    const { onlyInExpected, onlyInActual, precision, recall, f1 } = computeDiff(
      setExpected,
      setActual
    );

    return {
      precision,
      recall,
      f1,
      onlyInExpected: groupBySubject(onlyInExpected),
      onlyInActual: groupBySubject(onlyInActual),
    };
  }
}
