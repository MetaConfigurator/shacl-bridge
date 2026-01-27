# SHACL Bridge

[![Build Status](https://github.com/GeezFORCE/shacl-bridge/actions/workflows/node.js.yml/badge.svg)](https://github.com/GeezFORCE/shacl-bridge/actions)
[![npm version](https://img.shields.io/npm/v/shacl-bridge.svg)](https://www.npmjs.com/package/shacl-bridge)
[![npm downloads](https://img.shields.io/npm/dm/shacl-bridge.svg)](https://www.npmjs.com/package/shacl-bridge)
[![codecov](https://codecov.io/gh/GeezFORCE/shacl-bridge/graph/badge.svg?token=FSIANIX7XT)](https://codecov.io/gh/GeezFORCE/shacl-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for bidirectional conversion between SHACL (Shapes Constraint Language) and JSON Schema.

> **Note:** Currently supports SHACL → JSON Schema conversion. JSON Schema → SHACL conversion is under development.

## Installation

```bash
npm install -g shacl-bridge
```

## Usage

```bash
# Convert SHACL file to JSON Schema (outputs to stdout)
shacl-bridge -i input.ttl

# Save to output file
shacl-bridge -i input.ttl -o output.json

# Read from clipboard
shacl-bridge --from-clipboard

# Parse JSON-LD format
shacl-bridge -i input.jsonld --json-ld
```

## Features

- Convert SHACL to JSON Schema
- Support for Turtle and JSON-LD input formats
- Comprehensive SHACL constraint support
- Automatic blank node resolution

## Development

```bash
npm install          # Install dependencies
npm run build        # Build project
npm test             # Run tests
npm run lint         # Lint code
```

## License

MIT
