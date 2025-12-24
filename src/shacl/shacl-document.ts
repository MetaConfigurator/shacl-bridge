import type { Prefixes, Store, Term } from 'n3';

export interface ShaclDocument {
  prefix: Prefixes;
  store: Store;
  lists: Record<string, Term[]>;
  graphId: string;
  subjects: Term[];
}
