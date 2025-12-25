import { ShaclDocument } from './shacl-document';
import * as fs from 'node:fs';
import { Parser, Prefixes, Quad, Store, Term } from 'n3';

export class ShaclParser {
  private content = '';
  private graphId = '';

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withPath(path: string): this {
    this.content = this.getTurtleContent(path);
    return this;
  }

  async parse(): Promise<ShaclDocument> {
    const store = new Store();
    const { quads, prefixes } = await this.getQuadsAndPrefixes();
    store.addQuads(quads);
    // Use null for graphId to match any graph when graphId is empty
    const graphFilter = this.graphId || null;
    return {
      prefix: prefixes,
      store: store,
      lists: store.extractLists() as Record<string, Term[]>,
      graphId: this.graphId,
      subjects: store.getSubjects(null, null, graphFilter),
    };
  }

  private getTurtleContent(path: string): string {
    return fs.readFileSync(path, 'utf8');
  }

  private async getQuadsAndPrefixes(): Promise<{ quads: Quad[]; prefixes: Prefixes }> {
    const parser = new Parser({
      blankNodePrefix: '',
      format: 'text/turtle',
    });
    return new Promise((resolve, reject) => {
      const quads: Quad[] = [];
      parser.parse(this.content, (e, q, p) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (e) {
          reject(e);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (q) {
          if (q.graph.id != '') {
            this.graphId = q.graph.id;
          }
          quads.push(q);
        } else {
          resolve({ quads: quads, prefixes: p });
        }
      });
    });
  }
}
