import { ShaclParser } from '../parser/shacl-parser';
import { IntermediateRepresentationBuilder } from '../../ir/intermediate-representation-builder';
import { IrSchemaConverter } from '../../json-schema/ir-schema-converter';
import { ConversionOptions } from '../../json-schema/conversion-options';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';

type InputState = 'init' | 'ready';

export class ShaclReader {
  private parser = new ShaclParser();
  private state: InputState = 'init';
  private options: ConversionOptions = {};

  fromContent(content: string): this {
    this.guardState();
    this.parser.withContent(content);
    return this;
  }

  fromPath(path: string): this {
    this.guardState();
    this.parser.withPath(path);
    return this;
  }

  fromJsonLdContent(content: string): this {
    this.guardState();
    this.parser.withJsonLdContent(content);
    return this;
  }

  fromJsonLdPath(path: string): this {
    this.guardState();
    this.parser.withJsonLdPath(path);
    return this;
  }

  withOptions(options: ConversionOptions): this {
    this.options = options;
    return this;
  }

  async convert(): Promise<JsonSchemaObjectType> {
    if (this.state !== 'ready') {
      throw new Error(
        'No input specified. Call fromContent, fromPath, fromJsonLdContent, or fromJsonLdPath first.'
      );
    }
    const shaclDocument = await this.parser.parse();
    const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
    return new IrSchemaConverter(ir, this.options).convert();
  }

  private guardState(): void {
    if (this.state === 'ready') {
      throw new Error('Cannot set an(other) option after specifying it once');
    }
    this.state = 'ready';
  }
}
