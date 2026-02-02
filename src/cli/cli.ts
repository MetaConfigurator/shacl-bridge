#!/usr/bin/env node

import { Command, Option as CommanderOption } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { match } from 'ts-pattern';
import { ShaclParser } from '../shacl/shacl-parser';
import { IntermediateRepresentationBuilder } from '../ir/intermediate-representation-builder';
import { IrSchemaConverter } from '../json-schema/ir-schema-converter';
import { ShaclDocument } from '../shacl/shacl-document';

type OutputMode = 'single' | 'multi';

interface CliOptions {
  input?: string;
  fromClipboard: boolean;
  jsonLd: boolean;
  output?: string;
  mode: OutputMode;
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
  .addOption(
    new CommanderOption('-m, --mode <mode>', 'Output mode: single (default) or multi')
      .choices(['single', 'multi'])
      .default('single')
  )
  .action(async (options: CliOptions) => {
    try {
      validateOptions(options);
      await run(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function validateOptions(options: CliOptions): void {
  if (options.mode === 'multi' && !options.output) {
    throw new Error('Output directory is required when using multi mode.');
  }
}

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

    if (options.mode === 'multi' && options.output) {
      writeMultipleSchemas(result, options.output);
    } else if (options.mode === 'single') {
      writeSingleSchema(result, options.output);
    }
  } catch (error) {
    console.error('Exception while reading and processing SHACL content:', error);
    process.exit(1);
  }
}

function writeSingleSchema(
  result: ReturnType<IrSchemaConverter['convert']>,
  outputPath?: string
): void {
  const jsonOutput = JSON.stringify(result, null, 2);
  if (outputPath) {
    fs.writeFileSync(outputPath, jsonOutput);
  } else {
    console.log(jsonOutput);
  }
}

function writeMultipleSchemas(
  result: ReturnType<IrSchemaConverter['convert']>,
  outputDir: string
): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const defs = result.$defs ?? {};
  const prefixes = result['x-shacl-prefixes'] as Record<string, string> | undefined;

  for (const [name, schema] of Object.entries(defs)) {
    if (typeof schema === 'boolean') continue;

    const individualSchema = {
      $schema: result.$schema,
      ...schema,
      'x-shacl-prefixes': prefixes,
    };

    const convertedSchema = convertInternalRefsToExternal(individualSchema);
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(convertedSchema, null, 2));
  }
}

function convertInternalRefsToExternal(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (key, value: unknown) => {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('#/$defs/')) {
        return `${value.replace('#/$defs/', '')}.json`;
      }
      return value;
    })
  );
}

program.parse();
