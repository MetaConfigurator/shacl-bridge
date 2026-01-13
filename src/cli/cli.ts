#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ShaclParser } from '../shacl/shacl-parser';
import { IntermediateRepresentationBuilder } from '../ir/intermediate-representation-builder';
import { IrSchemaConverter } from '../json-schema/ir-schema-converter';
import { ShaclDocument } from '../shacl/shacl-document';

interface CliOptions {
  input?: string;
  includeMetadata: boolean;
  preserveRdfMetadata: boolean;
  fromClipboard: boolean;
  output?: string;
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

const program = new Command();

program
  .name('shacl-bridge')
  .description('Convert SHACL shapes to JSON Schema')
  .version(packageJson.version)
  .option('-i --input <file>', 'SHACL file to convert (Turtle format)')
  .option('--from-clipboard')
  // .option('--include-metadata', 'Include SHACL metadata as x-shacl-* extensions', false)
  // .option('--preserve-rdf-metadata', 'Preserve non-SHACL RDF properties as x-rdf-properties', false)
  .option('-o, --output <path>', 'Output file path (single mode) or directory (multi mode)')
  .action(async (options: CliOptions) => {
    try {
      await run(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function run(options: CliOptions): Promise<void> {
  let shaclDocument: ShaclDocument;
  try {
    if (options.fromClipboard) {
      const { default: clipboardy } = await import('clipboardy');
      const content = await clipboardy.read();
      shaclDocument = await new ShaclParser().withContent(content).parse();
    } else {
      const file = options.input;
      if (file == null || !fs.existsSync(file)) {
        console.error(`${file ?? ''} not found`);
        process.exit(1);
      }
      shaclDocument = await new ShaclParser().withPath(file).parse();
    }
  } catch (error) {
    console.error('Execption while reading and processing SHACL content:', error);
    process.exit(1);
  }

  // Build IR model
  const ir = new IntermediateRepresentationBuilder(shaclDocument).build();

  // Configure generator
  // const config: GeneratorConfig = {
  //   includeMetadata: options.includeMetadata,
  //   preserveRdfMetadata: options.preserveRdfMetadata,
  // };

  const result = new IrSchemaConverter(ir).convert();
  const jsonOutput = JSON.stringify(result, null, 2);
  if (options.output) {
    fs.writeFileSync(options.output, jsonOutput);
  } else {
    console.log(jsonOutput);
  }
}

program.parse();
