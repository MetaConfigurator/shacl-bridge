import { ShaclDocument } from './shacl-document';
import * as fs from 'node:fs';
import { Parser, Prefixes, Quad, Store, Term } from 'n3';

type BuilderState = 'init' | 'file' | 'content';

export class ShaclParser {
  private state: BuilderState = 'init';
  private content = '';
  private graphId = '';

  withContent(this: ShaclParser, content: string): ShaclParser {
    if (this.state === 'file') {
      throw new Error('Cannot set content after specifying a file path');
    }
    if (this.state === 'content') {
      throw new Error('Cannot set content more than once');
    }
    this.content = content;
    this.state = 'content';
    return this;
  }

  withPath(this: ShaclParser, path: string) {
    if (this.state === 'content') {
      throw new Error('Cannot set a file path after specifying content');
    }
    if (this.state === 'file') {
      throw new Error('Cannot set a file path more than once');
    }
    this.content = this.getTurtleContent(path);
    this.state = 'file';
    return this;
  }

  async parse(this: ShaclParser): Promise<ShaclDocument> {
    const store = new Store();
    const { quads, prefixes } = await this.getQuadsAndPrefixes();
    store.addQuads(quads);
    return {
      prefix: prefixes,
      store: store,
      lists: store.extractLists() as Record<string, Term[]>,
      graphId: this.graphId,
      subjects: store.getSubjects(null, null, this.graphId || null),
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
