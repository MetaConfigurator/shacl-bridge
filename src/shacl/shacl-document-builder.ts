import logger from '../logger';
import { ShaclDocument } from './model/shacl-document';
import { Triple } from './model/triple';

export class ShaclDocumentBuilder {
  private prefix = new Map<string, string>();
  private shapes: Triple[] = new Array<Triple>();
  private idMappings = new Map<string, string>();

  setPrefix(prefixName: string, prefixValue: string): this {
    logger.debug(`Adding prefix ${prefixName} : ${prefixValue}`);
    this.prefix.set(prefixName, prefixValue);
    return this;
  }

  setTriple(triple: Triple): this {
    this.shapes.push(triple);
    return this;
  }

  private createIdMappings() {
    const triplesWithIdMappings = this.shapes.filter(
      (shape) => typeof shape.object == 'string' && shape.object.startsWith('n3-')
    );
    for (const triple of triplesWithIdMappings) {
      if (typeof triple.object === 'string') {
        this.idMappings.set(triple.object, triple.subject);
      }
    }
  }

  build(): ShaclDocument {
    this.createIdMappings();
    return new ShaclDocument(new Map(this.prefix), this.shapes, this.idMappings);
  }
}
