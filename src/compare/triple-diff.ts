export interface SetDiff {
  onlyInA: Set<string>;
  onlyInB: Set<string>;
  score: number;
}

export function computeDiff(a: Set<string>, b: Set<string>): SetDiff {
  const onlyInA = new Set([...a].filter((x) => !b.has(x)));
  const onlyInB = new Set([...b].filter((x) => !a.has(x)));
  const unionSize = new Set([...a, ...b]).size;
  const score = unionSize === 0 ? 1 : (unionSize - onlyInA.size - onlyInB.size) / unionSize;
  return { onlyInA, onlyInB, score };
}
