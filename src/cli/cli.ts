#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ShaclParser } from '../shacl/shacl-parser';
import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../ir/intermediate-representation-builder';
import { GeneratorConfig, JsonSchema, Mode } from '../json-schema/meta/types';
import { match } from 'ts-pattern';
import JsonSchemaGenerator from '../json-schema/json-schema-generator';

interface CliOptions {
  mode: 'single' | 'multi';
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
  .option(
    '-m, --mode <mode>',
    'Output mode: single (all in one file) or multi (one file per shape)',
    'single'
  )
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
  const config: GeneratorConfig = {
    mode: options.mode == 'single' ? Mode.Single : Mode.Multi,
    includeMetadata: options.includeMetadata,
    preserveRdfMetadata: options.preserveRdfMetadata,
  };

  match(config.mode)
    .with(Mode.Single, () => {
      handleSingleMode(config, ir, options);
    })
    .with(Mode.Multi, () => {
      handleMultiMode(config, ir, options);
    })
    .exhaustive();
}

function handleSingleMode(
  config: GeneratorConfig,
  ir: IntermediateRepresentation,
  options: CliOptions
): void {
  const result = new JsonSchemaGenerator(config).generate(ir) as JsonSchema;
  const jsonOutput = JSON.stringify(result, null, 2);
  if (options.output) {
    fs.writeFileSync(options.output, jsonOutput);
  } else {
    console.log(jsonOutput);
  }
}

function handleMultiMode(
  config: GeneratorConfig,
  ir: IntermediateRepresentation,
  options: CliOptions
) {
  const result = new JsonSchemaGenerator(config).generate(ir) as {
    schemas: Map<string, JsonSchema>;
  };
  if (options.output) {
    // Write each schema to a separate file in the output directory
    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output, { recursive: true });
    }

    for (const [name, schema] of result.schemas) {
      const filePath = path.join(options.output, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));
    }
  } else {
    // Output all schemas as a single JSON object to stdout
    const allSchemas: Record<string, unknown> = {};
    for (const [name, schema] of result.schemas) {
      allSchemas[name] = schema;
    }
    console.log(JSON.stringify(allSchemas, null, 2));
  }
}

program.parse();
