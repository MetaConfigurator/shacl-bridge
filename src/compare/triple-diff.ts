export interface SetDiff {
  onlyInExpected: Set<string>;
  onlyInActual: Set<string>;
  precision: number;
  recall: number;
  f1: number;
}

export function computeDiff(expected: Set<string>, actual: Set<string>): SetDiff {
  const onlyInExpected = new Set([...expected].filter((x) => !actual.has(x)));
  const onlyInActual = new Set([...actual].filter((x) => !expected.has(x)));
  const tp = expected.size - onlyInExpected.size;
  const precision = actual.size > 0 ? tp / actual.size : 0;
  const recall = expected.size > 0 ? tp / expected.size : 0;
  const f1 =
    expected.size === 0 && actual.size === 0
      ? 1
      : precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;
  return { onlyInExpected, onlyInActual, precision, recall, f1 };
}
