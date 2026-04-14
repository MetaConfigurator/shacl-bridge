import fs from 'fs';
import path from 'path';

type OutputMode = 'single' | 'multi';

export interface ToJsonSchemaOptions {
  input?: string;
  fromClipboard: boolean;
  jsonLd: boolean;
  output?: string;
  mode: OutputMode;
  includeShaclExtensions: boolean;
  schemaId?: string;
  root?: string;
}

export interface ToShaclOptions {
  input?: string;
  output?: string;
  fromClipboard: boolean;
  jsonLd: boolean;
  baseUri?: string;
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

// String Constants

// Base
export const CLI_BASE = {
  name: 'shacl-bridge',
  description: 'Bi-Directional converter for SHACL and JSON Schema',
  version: packageJson.version,
};

// --to-json-schema
export const TO_JSON_SCHEMA = {
  command: 'to-json-schema',
  description: 'Convert SHACL to JSON Schema',
  input: {
    flag: '-i, --input <file>',
    description: 'SHACL file to convert (ttl or json-ld if --json-ld is specified)',
  },
  output: {
    flag: '-o, --output <file>',
    description:
      'File to which output must be written (single) or directory to which output files should be written (multi)',
  },
  fromClipboard: {
    flag: '--from-clipboard',
    description: 'Read SHACL content from clipboard',
    default: false,
  },
  jsonLd: {
    flag: '--json-ld',
    description: 'Input content as JSON LD',
    default: false,
  },
  includeShaclExtensions: {
    flag: '--include-shacl-extensions',
    description: 'Include x-shacl-* extension properties in output',
    default: false,
  },
  mode: {
    flag: '-m, --mode <mode>',
    description: 'Output mode: single (default) or multi',
    choices: ['single', 'multi'],
    default: 'single',
  },
  schemaId: {
    flag: '--schema-id <uri>',
    description: 'URI to use as the $id of the generated JSON Schema',
  },
  root: {
    flag: '--root <shape>',
    description:
      'SHACL shape to use as the root (local name or full URI); auto-detected if omitted',
  },
};

export interface CompareOptions {
  file1: string;
  file2: string;
  shorten: boolean;
}

export const COMPARE = {
  command: 'compare',
  description: 'Compare two SHACL files and output a similarity score with differences',
  file1: {
    flag: '--file1 <file>',
    description: 'First SHACL file (Turtle)',
  },
  file2: {
    flag: '--file2 <file>',
    description: 'Second SHACL file (Turtle)',
  },
  shorten: {
    flag: '--shorten',
    description: 'Shorten URIs using prefixes from the input files',
    default: false,
  },
};

export const TO_SHACL = {
  command: 'to-shacl',
  description: 'Convert JSON Schema to SHACL',
  input: {
    flag: '-i, --input <file>',
    description: 'JSON Schema file to convert',
  },
  output: {
    flag: '-o, --output <file>',
    description: 'File to which output must be written to',
  },
  fromClipboard: {
    flag: '--from-clipboard',
    description: 'Read JSON Schema content from clipboard',
    default: false,
  },
  jsonLd: {
    flag: '--json-ld',
    description: 'Output content as JSON LD',
    default: false,
  },
  baseUri: {
    flag: '--base-uri <uri>',
    description: 'Base URI for generated shapes',
  },
};
