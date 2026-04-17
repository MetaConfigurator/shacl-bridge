import { ShaclComparator } from '../../src/compare/shacl-comparator';

const SIMPLE = 'samples/shacl/simple-shacl.ttl';
const CARDINALITY = 'samples/shacl/cardinality-constraints.ttl';

describe('ShaclComparator', () => {
  it('returns f1=1 and empty diffs when comparing a file to itself', async () => {
    const result = await new ShaclComparator(SIMPLE, SIMPLE).compare();
    expect(result.f1).toBe(1);
    expect(result.onlyInExpected).toHaveLength(0);
    expect(result.onlyInActual).toHaveLength(0);
  });

  it('returns f1<1 and non-empty diffs for completely different files', async () => {
    const result = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    expect(result.f1).toBeLessThan(1);
    expect(result.onlyInExpected.length).toBeGreaterThan(0);
    expect(result.onlyInActual.length).toBeGreaterThan(0);
  });

  it('onlyInExpected groups are non-empty and subjects are non-empty strings', async () => {
    const result = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    for (const group of result.onlyInExpected) {
      expect(group.subject).toBeTruthy();
      expect(group.triples.length).toBeGreaterThan(0);
    }
  });

  it('onlyInActual groups are non-empty and subjects are non-empty strings', async () => {
    const result = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    for (const group of result.onlyInActual) {
      expect(group.subject).toBeTruthy();
      expect(group.triples.length).toBeGreaterThan(0);
    }
  });

  it('f1 is symmetric', async () => {
    const r1 = await new ShaclComparator(SIMPLE, CARDINALITY).compare();
    const r2 = await new ShaclComparator(CARDINALITY, SIMPLE).compare();
    expect(r1.f1).toBeCloseTo(r2.f1);
  });
});
