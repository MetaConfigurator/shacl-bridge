#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { match } from 'ts-pattern';
import { ShaclParser } from '../shacl/shacl-parser';
import { IntermediateRepresentationBuilder } from '../ir/intermediate-representation-builder';
import { IrSchemaConverter } from '../json-schema/ir-schema-converter';
import { ShaclDocument } from '../shacl/shacl-document';

interface CliOptions {
  input?: string;
  fromClipboard: boolean;
  jsonLd: boolean;
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
  .option('--from-clipboard', 'Read from clipboard', false)
  .option('--json-ld', 'Parse as JSON-LD', false)
  .option('-o, --output <path>', 'Output file path (single mode) or directory (multi mode)')
  .action(async (options: CliOptions) => {
    try {
      await run(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function loadShaclDocument(options: CliOptions): Promise<ShaclDocument> {
  const parser = new ShaclParser();

  return match(options)
    .with({ fromClipboard: true, jsonLd: true }, async () => {
      const { default: clipboardy } = await import('clipboardy');
      const content = await clipboardy.read();
      return parser.withJsonLdContent(content).parse();
    })
    .with({ fromClipboard: true, jsonLd: false }, async () => {
      const { default: clipboardy } = await import('clipboardy');
      const content = await clipboardy.read();
      return parser.withContent(content).parse();
    })
    .with({ fromClipboard: false, jsonLd: true }, ({ input }) => {
      if (!input || !fs.existsSync(input)) {
        throw new Error(`File not found: ${input ?? ''}`);
      }
      return parser.withJsonLdPath(input).parse();
    })
    .with({ fromClipboard: false, jsonLd: false }, ({ input }) => {
      if (!input || !fs.existsSync(input)) {
        throw new Error(`File not found: ${input ?? ''}`);
      }
      return parser.withPath(input).parse();
    })
    .exhaustive();
}

async function run(options: CliOptions): Promise<void> {
  try {
    const shaclDocument = await loadShaclDocument(options);
    const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
    const result = new IrSchemaConverter(ir).convert();
    const jsonOutput = JSON.stringify(result, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, jsonOutput);
    } else {
      console.log(jsonOutput);
    }
  } catch (error) {
    console.error('Exception while reading and processing SHACL content:', error);
    process.exit(1);
  }
}

program.parse();
