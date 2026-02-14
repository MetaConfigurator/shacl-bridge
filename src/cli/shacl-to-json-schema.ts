import { ToJsonSchemaOptions } from './cli-constants';
import fs from 'fs';
import { match } from 'ts-pattern';
import path from 'path';
import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';
import { ShaclReader } from '../shacl/reader/shacl-reader';

export class ShaclToJsonSchema {
  constructor(private readonly options: ToJsonSchemaOptions) {
    if (options.mode === 'multi' && !options.output) {
      throw new Error('Output directory is required when using multi mode.');
    }
  }

  async convert() {
    const reader = await this.configureReader();
    const result = await reader
      .withOptions({ excludeShaclExtensions: this.options.excludeShaclExtensions })
      .convert();
    match(this.options.mode)
      .with('single', () => {
        this.writeSingleSchema(result);
      })
      .with('multi', () => {
        this.writeMultipleSchemas(result);
      })
      .exhaustive();
  }

  private async configureReader(): Promise<ShaclReader> {
    const reader = new ShaclReader();
    return match(this.options)
      .with({ fromClipboard: true, jsonLd: true }, async () => {
        const { default: clipboardy } = await import('clipboardy');
        return reader.fromJsonLdContent(await clipboardy.read());
      })
      .with({ fromClipboard: true, jsonLd: false }, async () => {
        const { default: clipboardy } = await import('clipboardy');
        return reader.fromContent(await clipboardy.read());
      })
      .with({ fromClipboard: false, jsonLd: true }, ({ input }) => {
        if (!input || !fs.existsSync(input)) {
          throw new Error(`File not found: ${input ?? ''}`);
        }
        return reader.fromJsonLdPath(input);
      })
      .with({ fromClipboard: false, jsonLd: false }, ({ input }) => {
        if (!input || !fs.existsSync(input)) {
          throw new Error(`File not found: ${input ?? ''}`);
        }
        return reader.fromPath(input);
      })
      .exhaustive();
  }

  private writeSingleSchema(result: JsonSchemaObjectType): void {
    const jsonOutput = JSON.stringify(result, null, 2);
    const outputPath = this.options.output;
    if (outputPath) fs.writeFileSync(outputPath, jsonOutput);
    else console.log(jsonOutput);
  }

  private writeMultipleSchemas(result: JsonSchemaObjectType): void {
    const outputDir = this.options.output;
    if (outputDir == null) {
      throw new Error('Output directory is required when using multi mode');
    }

    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const defs = result.$defs ?? {};
    const prefixes = result['x-shacl-prefixes'] as Record<string, string> | undefined;

    for (const [name, schema] of Object.entries(defs)) {
      if (typeof schema === 'boolean') continue;

      const individualSchema = {
        $schema: result.$schema,
        ...schema,
        ...(prefixes && { 'x-shacl-prefixes': prefixes }),
      };

      const convertedSchema = this.convertInternalRefsToExternal(individualSchema);
      const filePath = path.join(outputDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(convertedSchema, null, 2));
    }
  }

  private convertInternalRefsToExternal(obj: unknown): unknown {
    return JSON.parse(
      JSON.stringify(obj, (key, value: unknown) => {
        if (key === '$ref' && typeof value === 'string' && value.startsWith('#/$defs/')) {
          return `${value.replace('#/$defs/', '')}.json`;
        }
        return value;
      })
    );
  }
}
