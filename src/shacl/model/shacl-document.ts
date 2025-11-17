import { Triple } from './triple';

export class ShaclDocument {
  constructor(
    public readonly prefix: Map<string, string>,
    public readonly shapes: Triple[],
    public readonly idMappings: Map<string, string>
  ) {}
}
