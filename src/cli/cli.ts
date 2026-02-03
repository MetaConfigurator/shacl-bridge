#!/usr/bin/env node

import { Command, Option as CommanderOption } from 'commander';
import {
  CLI_BASE,
  TO_JSON_SCHEMA,
  TO_SHACL,
  ToJsonSchemaOptions,
  ToShaclOptions,
} from './cli-constants';
import { ShaclToJsonSchema } from './shacl-to-json-schema';
import { JsonSchemaToShacl } from './json-schema-to-shacl';

const program = new Command();

// Base Command
program.name(CLI_BASE.name).description(CLI_BASE.description).version(CLI_BASE.version);

// --to-json-schema subcommand
const toJsonSchemaCommand = new Command(TO_JSON_SCHEMA.command)
  .description(TO_JSON_SCHEMA.description)
  .option(TO_JSON_SCHEMA.input.flag, TO_JSON_SCHEMA.input.description)
  .option(TO_JSON_SCHEMA.output.flag, TO_JSON_SCHEMA.output.description)
  .option(
    TO_JSON_SCHEMA.fromClipboard.flag,
    TO_JSON_SCHEMA.fromClipboard.description,
    TO_JSON_SCHEMA.fromClipboard.default
  )
  .option(
    TO_JSON_SCHEMA.jsonLd.flag,
    TO_JSON_SCHEMA.jsonLd.description,
    TO_JSON_SCHEMA.jsonLd.default
  )
  .option(
    TO_JSON_SCHEMA.excludeShaclExtensions.flag,
    TO_JSON_SCHEMA.excludeShaclExtensions.description,
    TO_JSON_SCHEMA.excludeShaclExtensions.default
  )
  .addOption(
    new CommanderOption(TO_JSON_SCHEMA.mode.flag, TO_JSON_SCHEMA.mode.description)
      .choices(TO_JSON_SCHEMA.mode.choices)
      .default(TO_JSON_SCHEMA.mode.default)
  )
  .action(async (options: ToJsonSchemaOptions) => {
    try {
      await new ShaclToJsonSchema(options).execute();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// --to-shacl subcommand
const toShaclCommand = new Command(TO_SHACL.command)
  .description(TO_SHACL.description)
  .option(TO_SHACL.input.flag, TO_SHACL.input.description)
  .option(TO_SHACL.output.flag, TO_SHACL.output.description)
  .option(
    TO_SHACL.fromClipboard.flag,
    TO_SHACL.fromClipboard.description,
    TO_SHACL.fromClipboard.default
  )
  .option(TO_SHACL.jsonLd.flag, TO_SHACL.jsonLd.description, TO_SHACL.jsonLd.default)
  .option(TO_SHACL.baseUri.flag, TO_SHACL.baseUri.description)
  .action(async (options: ToShaclOptions) => {
    try {
      await new JsonSchemaToShacl(options).execute();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.addCommand(toJsonSchemaCommand);
program.addCommand(toShaclCommand);
program.parse();
