export interface TripleDiff {
  subject: string;
  triples: string[];
}

export interface ComparisonResult {
  score: number;
  onlyInFile1: TripleDiff[];
  onlyInFile2: TripleDiff[];
}
