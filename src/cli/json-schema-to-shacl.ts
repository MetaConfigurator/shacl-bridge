import { ToShaclOptions } from './cli-constants';
import fs from 'fs';
import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';
import path from 'path';
import { ShaclWriter } from '../shacl/writer/shacl-writer';
import { DEFAULT_PREFIXES } from '../util/rdf-terms';
import { match } from 'ts-pattern';

export class JsonSchemaToShacl {
  constructor(private readonly options: ToShaclOptions) {
    if (options.input && !fs.existsSync(options.input)) {
      throw new Error(`File not found: ${options.input}`);
    }
  }

  async convert() {
    const schema = await this.loadJsonSchema();
    const output = await this.convertToShacl(schema);
    this.writeOutput(output);
  }

  private async loadJsonSchema(): Promise<JsonSchemaObjectType> {
    const content = await match(this.options)
      .with({ fromClipboard: true }, async () => {
        const { default: clipboardy } = await import('clipboardy');
        return clipboardy.read();
      })
      .with({ fromClipboard: false }, ({ input }) => {
        if (!input) throw new Error('Input file is required');
        return fs.readFileSync(input, 'utf-8');
      })
      .exhaustive();

    const schema = JSON.parse(content) as JsonSchemaObjectType;

    if (this.options.baseUri) {
      schema.$id = this.options.baseUri + (schema.$id ? path.basename(schema.$id) : 'Shape');
    }

    return schema;
  }

  private convertToShacl(schema: JsonSchemaObjectType): Promise<string> {
    const prefixes = {
      ...DEFAULT_PREFIXES,
      ex: this.extractBaseUri(schema.$id),
    } as Record<string, string>;

    return match(this.options)
      .with(
        { jsonLd: true },
        async () =>
          await new ShaclWriter(schema).getStoreBuilder().withPrefixes(prefixes).writeJsonLd()
      )
      .with(
        { jsonLd: false },
        async () => await new ShaclWriter(schema).getStoreBuilder().withPrefixes(prefixes).write()
      )
      .exhaustive();
  }

  private writeOutput(output: string): void {
    if (this.options.output) {
      fs.writeFileSync(this.options.output, output);
    } else {
      console.log(output);
    }
  }

  private extractBaseUri(id?: string): string {
    if (!id) return 'http://example.org/';

    const hashIndex = id.lastIndexOf('#');
    if (hashIndex !== -1) {
      return id.substring(0, hashIndex + 1);
    }

    const slashIndex = id.lastIndexOf('/');
    if (slashIndex !== -1) {
      return id.substring(0, slashIndex + 1);
    }

    return 'http://example.org/';
  }
}
