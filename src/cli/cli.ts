#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ShaclParser } from '../shacl/shacl-parser';
import { ModelBuilder } from '../ir/model-builder';
import {
  GeneratorConfig,
  isMultiSchemaResult,
  isSingleSchemaResult,
  JsonSchemaGenerator,
} from '../json-schema';

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
  const parser = new ShaclParser(file);
  const shaclDoc = await parser.parse();

  // Build IR model
  const model = new ModelBuilder(shaclDoc).build();

  // Configure generator
  const config: GeneratorConfig = {
    mode: options.mode,
    includeMetadata: options.includeMetadata,
    preserveRdfMetadata: options.preserveRdfMetadata,
  };

  // Generate JSON Schema
  const generator = new JsonSchemaGenerator(config);
  const result = generator.generate(model);

  // Output result
  if (isSingleSchemaResult(result)) {
    const jsonOutput = JSON.stringify(result.schema, null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, jsonOutput);
    } else {
      console.log(jsonOutput);
    }
  } else if (isMultiSchemaResult(result)) {
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
}

program.parse();
