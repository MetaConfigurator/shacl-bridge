import { ShaclDocument } from './shacl-document';
import * as fs from 'node:fs';
import { Parser, Prefixes, Quad, Store, Term } from 'n3';
import jsonld, { JsonLdDocument } from 'jsonld';

type BuilderState = 'init' | 'file' | 'content' | 'jsonld';

export class ShaclParser {
  private state: BuilderState = 'init';
  private content = '';
  private graphId = '';

  withContent(this: ShaclParser, content: string): ShaclParser {
    if (this.state != 'init') {
      throw new Error('Cannot set an(other) option after specifying it once');
    }
    this.content = content;
    this.state = 'content';
    return this;
  }

  withPath(this: ShaclParser, path: string) {
    if (this.state != 'init') {
      throw new Error('Cannot set an(other) option after specifying it once');
    }
    this.content = this.getTurtleContent(path);
    this.state = 'file';
    return this;
  }

  withJsonLdContent(this: ShaclParser, content: string): ShaclParser {
    if (this.state != 'init') {
      throw new Error('Cannot set an(other) option after specifying it once');
    }
    this.content = content;
    this.state = 'jsonld';
    return this;
  }

  withJsonLdPath(this: ShaclParser, path: string): ShaclParser {
    if (this.state != 'init') {
      throw new Error('Cannot set an(other) option after specifying it once');
    }
    this.content = fs.readFileSync(path, 'utf8');
    this.state = 'jsonld';
    return this;
  }

  async parse(this: ShaclParser): Promise<ShaclDocument> {
    if (this.state === 'jsonld') {
      const jsonLdObject: JsonLdDocument = JSON.parse(this.content) as JsonLdDocument;
      this.content = (await jsonld.toRDF(jsonLdObject, {
        format: 'application/n-quads',
      })) as string;
    }

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
