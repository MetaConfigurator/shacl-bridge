import { ShaclComparator } from '../../src/compare/shacl-comparator';

const SIMPLE = 'samples/shacl/simple-shacl.ttl';
const CARDINALITY = 'samples/shacl/cardinality-constraints.ttl';

describe('ShaclComparator', () => {
  it('returns score 1 and empty diffs when comparing a file to itself', async () => {
    const result = await new ShaclComparator(SIMPLE, SIMPLE).compare();
    expect(result.score).toBe(1);
    expect(result.onlyInFile1).toHaveLength(0);
    expect(result.onlyInFile2).toHaveLength(0);
  });

  it('returns score 0 and non-empty diffs for completely different files', async () => {
    const result = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    expect(result.score).toBe(0);
    expect(result.onlyInFile1.length).toBeGreaterThan(0);
    expect(result.onlyInFile2.length).toBeGreaterThan(0);
  });

  it('onlyInFile1 groups are non-empty and subjects are non-empty strings', async () => {
    const result = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    for (const group of result.onlyInFile1) {
      expect(group.subject).toBeTruthy();
      expect(group.triples.length).toBeGreaterThan(0);
    }
  });

  it('onlyInFile2 groups are non-empty and subjects are non-empty strings', async () => {
    const result = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    for (const group of result.onlyInFile2) {
      expect(group.subject).toBeTruthy();
      expect(group.triples.length).toBeGreaterThan(0);
    }
  });

  it('is symmetric in score', async () => {
    const r1 = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    const r2 = await new ShaclComparator(CARDINALITY, SIMPLE).compare();
    expect(r1.score).toBeCloseTo(r2.score);
  });
});
