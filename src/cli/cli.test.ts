import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';
import { TO_JSON_SCHEMA, TO_SHACL } from './cli-constants';

describe('CLI', () => {
  const cliPath = path.join(__dirname, '../../dist/cli/cli.js');
  const samplesDir = path.join(__dirname, '../../samples/shacl');
  const jsonSchemaSamplesDir = path.join(__dirname, '../../samples/json-schema');
  const simpleShaclPath = path.join(samplesDir, 'simple-shacl.ttl');
  const simpleJsonLdPath = path.join(samplesDir, 'simple-shacl.jsonld');
  const simpleJsonSchemaPath = path.join(jsonSchemaSamplesDir, 'complex-system-config.json');

  const runCli = (args: string): string => {
    return execSync(`node ${cliPath} ${args}`, { encoding: 'utf-8' });
  };

  beforeAll(() => {
    execSync('npm run build', { cwd: path.join(__dirname, '../..') });
  });

  describe('--help', () => {
    it('should show help with --help', () => {
      const output = runCli('--help');

      expect(output).toContain('Usage:');
      expect(output).toContain('shacl-bridge');
      expect(output).toContain('to-json-schema');
      expect(output).toContain('to-shacl');
      expect(output).toContain('--version');
      expect(output).toContain('--help');
    });

    it('should show help for subcommand to-json-schema', () => {
      const output = runCli('to-json-schema --help');

      expect(output).toContain('Usage: shacl-bridge to-json-schema [options]');
      expect(output).toContain('-h, --help');
      expect(output).toContain(TO_JSON_SCHEMA.description);
      expect(output).toContain(TO_JSON_SCHEMA.input.flag);
      expect(output).toContain(TO_JSON_SCHEMA.output.flag);
      expect(output).toContain(TO_JSON_SCHEMA.fromClipboard.flag);
      expect(output).toContain(TO_JSON_SCHEMA.jsonLd.flag);
      expect(output).toContain(TO_JSON_SCHEMA.excludeShaclExtensions.flag);
      expect(output).toContain(TO_JSON_SCHEMA.mode.flag);
    });

    it('should show help for subcommand to-shacl', () => {
      const output = runCli('to-shacl --help');

      expect(output).toContain('Usage: shacl-bridge to-shacl [options]');
      expect(output).toContain('-h, --help');
      expect(output).toContain(TO_SHACL.description);
      expect(output).toContain(TO_SHACL.input.flag);
      expect(output).toContain(TO_SHACL.output.flag);
      expect(output).toContain(TO_SHACL.fromClipboard.flag);
      expect(output).toContain(TO_SHACL.jsonLd.flag);
      expect(output).toContain(TO_SHACL.baseUri.flag);
    });
  });

  describe('--version', () => {
    it('should show version with --version', () => {
      const output = runCli('--version');
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('subcommand to-json-schema', () => {
    describe('most realestic usage', () => {
      it('should output JSON Schema to stdout', () => {
        const output = runCli(`to-json-schema -i ${simpleShaclPath}`);
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.$defs).toBeDefined();
      });
    });

    describe('--output option', () => {
      it('should write to file when --output is specified', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-test-'));
        const outputPath = path.join(tempDir, 'schema.json');

        try {
          runCli(`to-json-schema --input ${simpleShaclPath} --output ${outputPath}`);
          expect(fs.existsSync(outputPath)).toBe(true);
          const content = fs.readFileSync(outputPath, 'utf-8');
          const schema = JSON.parse(content) as JsonSchemaObjectType;
          expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });
    });

    describe('error handling', () => {
      it('should error when file does not exist', () => {
        expect(() => {
          runCli('/nonexistent/file.ttl');
        }).toThrow();
      });

      it('should error when no input file is provided', () => {
        expect(() => {
          runCli('');
        }).toThrow();
      });
    });

    describe('--json-ld flag', () => {
      it('should parse JSON-LD file with --json-ld flag', () => {
        const output = runCli(`to-json-schema -i ${simpleJsonLdPath} --json-ld`);
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.$defs).toBeDefined();
        expect(Object.keys(schema.$defs ?? {}).length).toBeGreaterThan(0);
      });

      it('should write JSON-LD output to file with --output', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-jsonld-test-'));
        const outputPath = path.join(tempDir, 'schema-jsonld.json');

        try {
          runCli(`to-json-schema --input ${simpleJsonLdPath} --json-ld --output ${outputPath}`);
          expect(fs.existsSync(outputPath)).toBe(true);

          const content = fs.readFileSync(outputPath, 'utf-8');
          const schema = JSON.parse(content) as JsonSchemaObjectType;

          expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
          expect(schema.$defs).toBeDefined();
          expect(Object.keys(schema.$defs ?? {}).length).toBeGreaterThan(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });

      it('should produce equivalent output for Turtle and JSON-LD formats', () => {
        const turtleOutput = runCli(`to-json-schema -i ${simpleShaclPath}`);
        const jsonLdOutput = runCli(`to-json-schema -i ${simpleJsonLdPath} --json-ld`);

        const turtleSchema = JSON.parse(turtleOutput) as JsonSchemaObjectType;
        const jsonLdSchema = JSON.parse(jsonLdOutput) as JsonSchemaObjectType;

        // Both should have the same schema version
        expect(turtleSchema.$schema).toBe(jsonLdSchema.$schema);

        // Both should have definitions
        expect(turtleSchema.$defs).toBeDefined();
        expect(jsonLdSchema.$defs).toBeDefined();

        // Should have similar number of shape definitions
        const turtleDefsCount = Object.keys(turtleSchema.$defs ?? {}).length;
        const jsonLdDefsCount = Object.keys(jsonLdSchema.$defs ?? {}).length;
        expect(turtleDefsCount).toBe(jsonLdDefsCount);
      });
    });

    describe('--exclude-shacl-extensions flag', () => {
      it('should include x-shacl-prefixes by default', () => {
        const output = runCli(`to-json-schema -i ${simpleShaclPath}`);
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema['x-shacl-prefixes']).toBeDefined();
      });

      it('should exclude x-shacl-prefixes when --exclude-shacl-extensions is specified', () => {
        const output = runCli(`to-json-schema -i ${simpleShaclPath} --exclude-shacl-extensions`);
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema['x-shacl-prefixes']).toBeUndefined();
        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.$defs).toBeDefined();
      });

      it('should work with --output option', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-exclude-ext-test-'));
        const outputPath = path.join(tempDir, 'schema.json');

        try {
          runCli(
            `to-json-schema --input ${simpleShaclPath} --exclude-shacl-extensions --output ${outputPath}`
          );
          expect(fs.existsSync(outputPath)).toBe(true);
          const content = fs.readFileSync(outputPath, 'utf-8');
          const schema = JSON.parse(content) as JsonSchemaObjectType;
          expect(schema['x-shacl-prefixes']).toBeUndefined();
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });

      it('should work with --json-ld flag', () => {
        const output = runCli(
          `to-json-schema -i ${simpleJsonLdPath} --json-ld --exclude-shacl-extensions`
        );
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema['x-shacl-prefixes']).toBeUndefined();
        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      });

      it('should work with --mode multi', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-multi-exclude-test-'));

        try {
          runCli(
            `to-json-schema -i ${simpleShaclPath} --mode multi --output ${tempDir} --exclude-shacl-extensions`
          );

          const files = fs.readdirSync(tempDir);
          expect(files.length).toBeGreaterThan(0);

          const personFile = path.join(tempDir, 'Person.json');
          expect(fs.existsSync(personFile)).toBe(true);

          const personSchema = JSON.parse(
            fs.readFileSync(personFile, 'utf-8')
          ) as JsonSchemaObjectType;
          expect(personSchema['x-shacl-prefixes']).toBeUndefined();
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });
    });

    describe('--mode option', () => {
      it('should show --mode option in help', () => {
        const output = runCli('to-json-schema --help');
        expect(output).toContain('--mode');
        expect(output).toContain('-m');
      });

      it('should default to single mode when --mode is not specified', () => {
        const output = runCli(`to-json-schema -i ${simpleShaclPath}`);
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.$defs).toBeDefined();
      });

      it('should output single schema when --mode single is specified', () => {
        const output = runCli(`to-json-schema -i ${simpleShaclPath} --mode single`);
        const schema = JSON.parse(output) as JsonSchemaObjectType;

        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.$defs).toBeDefined();
      });

      it('should output individual files when --mode multi with --output directory', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-multi-test-'));

        try {
          runCli(`to-json-schema -i ${simpleShaclPath} --mode multi --output ${tempDir}`);

          const files = fs.readdirSync(tempDir);
          expect(files.length).toBeGreaterThan(0);
          expect(files.some((f) => f.endsWith('.json'))).toBe(true);

          const personFile = path.join(tempDir, 'Person.json');
          expect(fs.existsSync(personFile)).toBe(true);

          const personSchema = JSON.parse(
            fs.readFileSync(personFile, 'utf-8')
          ) as JsonSchemaObjectType;
          expect(personSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
          expect(personSchema.title).toBe('Person');
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });

      it('should convert $ref to external file references in multi mode', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-multi-ref-test-'));
        const shaclWithRefs = path.join(samplesDir, 'complex-shacl.ttl');

        try {
          runCli(`to-json-schema -i ${shaclWithRefs} --mode multi --output ${tempDir}`);

          const files = fs.readdirSync(tempDir);
          for (const file of files) {
            const content = fs.readFileSync(path.join(tempDir, file), 'utf-8');
            expect(content).not.toContain('#/$defs/');
          }
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });

      it('should error when --mode multi is specified without --output', () => {
        expect(() => {
          runCli(`to-json-schema -i ${simpleShaclPath} --mode multi`);
        }).toThrow();
      });

      it('should error when --mode has invalid value', () => {
        expect(() => {
          runCli(`to-json-schema -i ${simpleShaclPath} --mode invalid`);
        }).toThrow();
      });
    });
  });

  describe('subcommand to-shacl', () => {
    describe('most realestic usage', () => {
      it('should convert JSON Schema to SHACL Turtle', () => {
        const output = runCli(`to-shacl -i ${simpleJsonSchemaPath}`);

        expect(output).toContain('sh:NodeShape');
        expect(output).toContain('sh:property');
      });
    });

    describe('error handling', () => {
      it('should error when file does not exist', () => {
        expect(() => {
          runCli('to-shacl -i /nonexistent/file.json');
        }).toThrow();
      });
    });

    describe('--output option', () => {
      it('should write SHACL output to file with --output', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-to-shacl-test-'));
        const outputPath = path.join(tempDir, 'shapes.ttl');

        try {
          runCli(`to-shacl -i ${simpleJsonSchemaPath} -o ${outputPath}`);
          expect(fs.existsSync(outputPath)).toBe(true);
          const content = fs.readFileSync(outputPath, 'utf-8');
          expect(content).toContain('sh:NodeShape');
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });
    });

    describe('--base-uri option', () => {
      it('should support --base-uri option', () => {
        const output = runCli(
          `to-shacl -i ${simpleJsonSchemaPath} --base-uri https://example.com/shapes/`
        );
        expect(output).toContain('https://example.com/shapes/');
      });
    });

    describe('--json-ld flag', () => {
      it('should output JSON-LD with --json-ld flag', () => {
        const output = runCli(`to-shacl -i ${simpleJsonSchemaPath} --json-ld`);
        const jsonLd = JSON.parse(output) as Record<string, unknown>;

        expect(jsonLd['@context']).toBeDefined();
        expect(output).toContain('NodeShape');
      });

      it('should write JSON-LD output to file with --json-ld and --output', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-to-shacl-jsonld-test-'));
        const outputPath = path.join(tempDir, 'shapes.jsonld');

        try {
          runCli(`to-shacl -i ${simpleJsonSchemaPath} --json-ld -o ${outputPath}`);
          expect(fs.existsSync(outputPath)).toBe(true);
          const content = fs.readFileSync(outputPath, 'utf-8');
          const jsonLd = JSON.parse(content) as Record<string, unknown>;
          expect(jsonLd['@context']).toBeDefined();
        } finally {
          fs.rmSync(tempDir, { recursive: true });
        }
      });
    });
  });
});
