import { ShaclDocumentBuilder } from './shacl-document-builder';
import { ShaclDocument } from './model/shacl-document';
import * as fs from 'node:fs';
import { Parser } from 'n3';
import logger from '../logger';

export class ShaclParser {
  private readonly content: string;
  private readonly shaclDocumentBuilder: ShaclDocumentBuilder;

  constructor(path: string) {
    this.content = this.getTurtleContent(path);
    this.shaclDocumentBuilder = new ShaclDocumentBuilder();
  }

  getTurtleContent(path: string): string {
    return fs.readFileSync(path, 'utf8');
  }

  async parse(): Promise<ShaclDocument> {
    const parser = new Parser({ format: 'text/turtle' });
    return new Promise((resolve, reject) => {
      parser.parse(this.content, (error, quad, prefixes) => {
        // TODO: check if this is the correct way to handle errors
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (error) {
          logger.error(`Exception while parsing document : ${error}`);
          reject(error);
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (quad) {
          this.shaclDocumentBuilder.add(quad);
        } else {
          // For some reason, the prefixes are only extracted at the end.
          // The whole parser works with callbacks and we should wait for it.
          logger.debug(`Extracting prefixes`);
          this.addPrefixes(prefixes as unknown as Record<string, string>);
          resolve(this.shaclDocumentBuilder.build());
        }
      });
    });
  }

  addPrefixes(prefixes: Record<string, string>): void {
    for (const prefixKey in prefixes) {
      this.shaclDocumentBuilder.setPrefix(prefixKey, prefixes[prefixKey]);
    }
  }
}
