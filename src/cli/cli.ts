#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ShaclParser } from '../shacl/shacl-parser';
import { IntermediateRepresentationBuilder } from '../ir/intermediate-representation-builder';
import { IrSchemaConverter } from '../json-schema/ir-schema-converter';

interface CliOptions {
  includeMetadata: boolean;
  preserveRdfMetadata: boolean;
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
  .argument('<file>', 'SHACL file to convert (Turtle format)')
  .option('--include-metadata', 'Include SHACL metadata as x-shacl-* extensions', false)
  .option('--preserve-rdf-metadata', 'Preserve non-SHACL RDF properties as x-rdf-properties', false)
  .option('-o, --output <path>', 'Output file path (single mode) or directory (multi mode)')
  .action(async (file: string, options: CliOptions) => {
    try {
      await run(file, options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function run(file: string, options: CliOptions): Promise<void> {
  // Validate input file exists
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  // Parse SHACL
  const shaclDocument = await new ShaclParser().withPath(file).parse();

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
