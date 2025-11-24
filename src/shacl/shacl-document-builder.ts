import logger from '../logger';
import { ShaclDocument } from './model/shacl-document';
import { Quad, Store } from 'n3';

export class ShaclDocumentBuilder {
  private prefix = new Map<string, string>();
  private store = new Store();

  setPrefix(prefixName: string, prefixValue: string): this {
    logger.debug(`Adding prefix ${prefixName} : ${prefixValue}`);
    this.prefix.set(prefixName, prefixValue);
    return this;
  }

  add(triple: Quad): this {
    this.store.addQuad(triple);
    return this;
  }

  build(): ShaclDocument {
    return new ShaclDocument(new Map(this.prefix), this.store);
  }
}
