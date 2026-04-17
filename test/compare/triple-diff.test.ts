import { computeDiff } from '../../src/compare/triple-diff';

describe('computeDiff', () => {
  it('returns f1=1 and empty diffs for identical sets', () => {
    const a = new Set(['triple1', 'triple2', 'triple3']);
    const result = computeDiff(a, new Set(a));
    expect(result.f1).toBe(1);
    expect(result.onlyInExpected.size).toBe(0);
    expect(result.onlyInActual.size).toBe(0);
  });

  it('returns f1=0 and full diffs for completely disjoint sets', () => {
    const expected = new Set(['triple1', 'triple2']);
    const actual = new Set(['triple3', 'triple4']);
    const result = computeDiff(expected, actual);
    expect(result.f1).toBe(0);
    expect(result.onlyInExpected).toEqual(new Set(['triple1', 'triple2']));
    expect(result.onlyInActual).toEqual(new Set(['triple3', 'triple4']));
  });

  it('computes correct F1 for partial overlap', () => {
    // expected={t1,t2,t3}, actual={t2,t3,t4}, tp=2, precision=2/3, recall=2/3, F1=2/3
    const expected = new Set(['t1', 't2', 't3']);
    const actual = new Set(['t2', 't3', 't4']);
    const result = computeDiff(expected, actual);
    expect(result.f1).toBeCloseTo(2 / 3);
    expect(result.precision).toBeCloseTo(2 / 3);
    expect(result.recall).toBeCloseTo(2 / 3);
    expect(result.onlyInExpected).toEqual(new Set(['t1']));
    expect(result.onlyInActual).toEqual(new Set(['t4']));
  });

  it('returns f1=1 for two empty sets', () => {
    const result = computeDiff(new Set(), new Set());
    expect(result.f1).toBe(1);
  });

  it('returns f1=0 when actual is empty but expected is not', () => {
    const expected = new Set(['t1', 't2']);
    const result = computeDiff(expected, new Set());
    expect(result.f1).toBe(0);
    expect(result.onlyInExpected).toEqual(expected);
    expect(result.onlyInActual.size).toBe(0);
  });
});
