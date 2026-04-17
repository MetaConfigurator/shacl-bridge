# SHACL Bridge

[![Build Status](https://github.com/MetaConfigurator/shacl-bridge/actions/workflows/node.js.yml/badge.svg)](https://github.com/MetaConfigurator/shacl-bridge/actions)
[![npm version](https://img.shields.io/npm/v/shacl-bridge.svg)](https://www.npmjs.com/package/shacl-bridge)
[![npm downloads](https://img.shields.io/npm/dm/shacl-bridge.svg)](https://www.npmjs.com/package/shacl-bridge)
[![codecov](https://codecov.io/gh/GeezFORCE/shacl-bridge/graph/badge.svg?token=FSIANIX7XT)](https://codecov.io/gh/GeezFORCE/shacl-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for bidirectional conversion between SHACL (Shapes Constraint Language) and JSON Schema.

## Installation

```bash
npm install -g shacl-bridge
```

## Usage

### CLI

#### SHACL to JSON Schema

```bash
# Convert SHACL file to JSON Schema (outputs to stdout)
shacl-bridge to-json-schema -i input.ttl

# Save to output file
shacl-bridge to-json-schema -i input.ttl -o output.json

# Read from clipboard
shacl-bridge to-json-schema --from-clipboard

# Parse JSON-LD format
shacl-bridge to-json-schema -i input.jsonld --json-ld

# Output each schema definition to separate files
shacl-bridge to-json-schema -i input.ttl --mode multi -o ./schemas/

# Include x-shacl-* extension properties in output
shacl-bridge to-json-schema -i input.ttl --include-shacl-extensions

# Set a custom $id on the generated JSON Schema
shacl-bridge to-json-schema -i input.ttl --schema-id https://example.org/my-schema

# Use a specific SHACL shape as the root (auto-detected if omitted)
shacl-bridge to-json-schema -i input.ttl --root Person
```

#### JSON Schema to SHACL

```bash
# Convert JSON Schema to SHACL Turtle (outputs to stdout)
shacl-bridge to-shacl -i input.json

# Save to output file
shacl-bridge to-shacl -i input.json -o output.ttl

# Read from clipboard
shacl-bridge to-shacl --from-clipboard

# Output as JSON-LD instead of Turtle
shacl-bridge to-shacl -i input.json --json-ld

# Specify base URI for generated shapes
shacl-bridge to-shacl -i input.json --base-uri http://example.org/shapes/
```

#### Compare SHACL Files

```bash
# Compare two SHACL files and print precision, recall, and F1 with differences
shacl-bridge compare --expected schema-v1.ttl --actual schema-v2.ttl

# Shorten URIs in the diff output using prefixes from the input files
shacl-bridge compare --expected schema-v1.ttl --actual schema-v2.ttl --shorten
```

Example output:

```
Precision: 0.8000  Recall: 0.6667  F1: 0.7273

Only in expected (schema-v1.ttl):
  [http://example.org/PersonShape]
    <http://example.org/PersonShape> <http://www.w3.org/ns/shacl#property> _:c14n0 .
    _:c14n0 <http://www.w3.org/ns/shacl#minCount> "1" .

Only in actual (schema-v2.ttl):
  [http://example.org/PersonShape]
    <http://example.org/PersonShape> <http://www.w3.org/ns/shacl#property> _:c14n0 .
    _:c14n0 <http://www.w3.org/ns/shacl#minCount> "2" .
```

Metrics are computed on the canonicalized RDF triples of both files (via RDFC-1.0). Blank nodes are assigned
deterministic labels based on their structural context, so structurally identical property shapes compare as equal
regardless of their original blank node identifiers. `--expected` is the reference (ground truth) and `--actual` is
the file being evaluated.

#### Command Options

##### `to-json-schema`

| Option                       | Description                                                             |
|------------------------------|-------------------------------------------------------------------------|
| `-i, --input <file>`         | SHACL file to convert (Turtle or JSON-LD)                               |
| `-o, --output <file>`        | Output file (single mode) or directory (multi mode)                     |
| `--from-clipboard`           | Read SHACL content from clipboard                                       |
| `--json-ld`                  | Parse input as JSON-LD format                                           |
| `-m, --mode <mode>`          | Output mode: `single` (default) or `multi`                              |
| `--include-shacl-extensions` | Include `x-shacl-*` extension properties in output                      |
| `--schema-id <uri>`          | Set the `$id` of the generated JSON Schema                              |
| `--root <shape>`             | Shape to use as root (local name or full URI); auto-detected if omitted |

##### `to-shacl`

| Option                | Description                             |
|-----------------------|-----------------------------------------|
| `-i, --input <file>`  | JSON Schema file to convert             |
| `-o, --output <file>` | Output file for SHACL                   |
| `--from-clipboard`    | Read JSON Schema content from clipboard |
| `--json-ld`           | Output as JSON-LD instead of Turtle     |
| `--base-uri <uri>`    | Base URI for generated shapes           |

##### `compare`

| Option              | Description                                            |
|---------------------|--------------------------------------------------------|
| `--expected <file>` | Expected (reference) SHACL file (Turtle, required)     |
| `--actual <file>`   | Actual (predicted) SHACL file (Turtle, required)       |
| `--shorten`         | Shorten URIs in diff output using prefixes from inputs |

#### Output Modes (to-json-schema)

The `--mode` (`-m`) option controls how the JSON Schema output is structured:

- **single** (default): Outputs a single JSON Schema file with all definitions in `$defs`
- **multi**: Outputs each schema definition to a separate file in the specified directory. References between schemas
  are converted to external file references (e.g., `Person.json` instead of `#/$defs/Person`)

### Features

- Bidirectional conversion between SHACL and JSON Schema
- Support for Turtle and JSON-LD formats
- Comprehensive SHACL constraint support
- Automatic blank node resolution
- Multi-file output mode for modular schemas
- SHACL document comparison with precision/recall/F1 scoring and triple-level diff

### Programmatic API

Install as a dependency:

```bash
npm install shacl-bridge
```

#### SHACL to JSON Schema

```typescript
import {ShaclReader} from 'shacl-bridge';

// Convert from Turtle file
const jsonSchema = await new ShaclReader().fromPath('input.ttl').convert();

// Convert from string content
const jsonSchema = await new ShaclReader().fromContent(turtleString).convert();

// Convert from JSON-LD file
const jsonSchema = await new ShaclReader().fromJsonLdPath('input.jsonld').convert();

// Convert from JSON-LD string content
const jsonSchema = await new ShaclReader().fromJsonLdContent(jsonLdString).convert();

// With options (exclude x-shacl-* extensions)
const jsonSchema = await new ShaclReader()
        .fromPath('input.ttl')
        .withOptions({includeShaclExtensions: true})
        .convert();
```

#### JSON Schema to SHACL

```typescript
import {ShaclWriter, DEFAULT_PREFIXES} from 'shacl-bridge';

const jsonSchema = {
    $id: 'http://example.org/PersonShape',
    type: 'object',
    properties: {
        name: {type: 'string', minLength: 1},
        age: {type: 'integer', minimum: 0},
    },
    required: ['name'],
};

// Convert to Turtle
const turtle = await new ShaclWriter(jsonSchema)
    .getStoreBuilder()
    .withPrefixes({...DEFAULT_PREFIXES, ex: 'http://example.org/'})
    .write();

// Convert to JSON-LD
const jsonLd = await new ShaclWriter(jsonSchema)
    .getStoreBuilder()
    .withPrefixes({...DEFAULT_PREFIXES, ex: 'http://example.org/'})
    .writeJsonLd();
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Build project
npm test             # Run tests
npm run lint         # Lint code
```

## License

MIT
