# SHACL Bridge

[![Build Status](https://github.com/GeezFORCE/shacl-bridge/actions/workflows/node.js.yml/badge.svg)](https://github.com/GeezFORCE/shacl-bridge/actions)
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

# Exclude x-shacl-* extension properties from output
shacl-bridge to-json-schema -i input.ttl --exclude-shacl-extensions
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

#### Command Options

##### `to-json-schema`

| Option                       | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `-i, --input <file>`         | SHACL file to convert (Turtle or JSON-LD)           |
| `-o, --output <file>`        | Output file (single mode) or directory (multi mode) |
| `--from-clipboard`           | Read SHACL content from clipboard                   |
| `--json-ld`                  | Parse input as JSON-LD format                       |
| `-m, --mode <mode>`          | Output mode: `single` (default) or `multi`          |
| `--exclude-shacl-extensions` | Exclude `x-shacl-*` properties from output          |

##### `to-shacl`

| Option                | Description                             |
| --------------------- | --------------------------------------- |
| `-i, --input <file>`  | JSON Schema file to convert             |
| `-o, --output <file>` | Output file for SHACL                   |
| `--from-clipboard`    | Read JSON Schema content from clipboard |
| `--json-ld`           | Output as JSON-LD instead of Turtle     |
| `--base-uri <uri>`    | Base URI for generated shapes           |

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

### Programmatic API

Install as a dependency:

```bash
npm install shacl-bridge
```

#### SHACL to JSON Schema

```typescript
import { ShaclReader } from 'shacl-bridge';

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
  .withOptions({ excludeShaclExtensions: true })
  .convert();
```

#### JSON Schema to SHACL

```typescript
import { ShaclWriter, DEFAULT_PREFIXES } from 'shacl-bridge';

const jsonSchema = {
  $id: 'http://example.org/PersonShape',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'integer', minimum: 0 },
  },
  required: ['name'],
};

// Convert to Turtle
const turtle = await new ShaclWriter(jsonSchema)
  .getStoreBuilder()
  .withPrefixes({ ...DEFAULT_PREFIXES, ex: 'http://example.org/' })
  .write();

// Convert to JSON-LD
const jsonLd = await new ShaclWriter(jsonSchema)
  .getStoreBuilder()
  .withPrefixes({ ...DEFAULT_PREFIXES, ex: 'http://example.org/' })
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
