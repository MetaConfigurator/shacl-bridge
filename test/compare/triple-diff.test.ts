import { computeDiff } from '../../src/compare/triple-diff';

describe('computeDiff', () => {
  it('returns score 1 and empty diffs for identical sets', () => {
    const a = new Set(['triple1', 'triple2', 'triple3']);
    const result = computeDiff(a, new Set(a));
    expect(result.score).toBe(1);
    expect(result.onlyInA.size).toBe(0);
    expect(result.onlyInB.size).toBe(0);
  });

  it('returns score 0 and full diffs for completely disjoint sets', () => {
    const a = new Set(['triple1', 'triple2']);
    const b = new Set(['triple3', 'triple4']);
    const result = computeDiff(a, b);
    expect(result.score).toBe(0);
    expect(result.onlyInA).toEqual(new Set(['triple1', 'triple2']));
    expect(result.onlyInB).toEqual(new Set(['triple3', 'triple4']));
  });

  it('computes correct Jaccard for partial overlap', () => {
    // |A| = 3, |B| = 3, |A∩B| = 2, |A∪B| = 4, Jaccard = 2/4 = 0.5
    const a = new Set(['t1', 't2', 't3']);
    const b = new Set(['t2', 't3', 't4']);
    const result = computeDiff(a, b);
    expect(result.score).toBeCloseTo(0.5);
    expect(result.onlyInA).toEqual(new Set(['t1']));
    expect(result.onlyInB).toEqual(new Set(['t4']));
  });

  it('returns score 1 for two empty sets', () => {
    const result = computeDiff(new Set(), new Set());
    expect(result.score).toBe(1);
  });

  it('returns score 0 when one set is empty', () => {
    const a = new Set(['t1', 't2']);
    const result = computeDiff(a, new Set());
    expect(result.score).toBe(0);
    expect(result.onlyInA).toEqual(a);
    expect(result.onlyInB.size).toBe(0);
  });
});
