export interface TripleDiff {
  subject: string;
  triples: string[];
}

export interface ComparisonResult {
  precision: number;
  recall: number;
  f1: number;
  onlyInExpected: TripleDiff[];
  onlyInActual: TripleDiff[];
}
