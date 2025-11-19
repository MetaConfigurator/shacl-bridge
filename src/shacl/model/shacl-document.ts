import { Store } from 'n3';

export class ShaclDocument {
  constructor(
    public readonly prefix: Map<string, string>,
    public readonly store: Store
  ) {}
}
