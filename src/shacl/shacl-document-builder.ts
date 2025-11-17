import logger from '../logger';
import { ShaclDocument } from './shacl-document';

export class ShaclDocumentBuilder {
  private prefix: Map<string, string> = new Map();

  setPrefix(prefixName: string, prefixValue: string) {
    logger.debug(`Adding prefix ${prefixName} : ${prefixValue}`);
    this.prefix.set(prefixName, prefixValue);
    return this;
  }

  build(): ShaclDocument {
    return new ShaclDocument(new Map(this.prefix));
  }
}
