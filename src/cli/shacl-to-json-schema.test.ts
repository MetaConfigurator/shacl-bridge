import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ShaclToJsonSchema } from './shacl-to-json-schema';
import { ToJsonSchemaOptions } from './cli-constants';
import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';

describe('ShaclToJsonSchema', () => {
  const samplesDir = path.join(__dirname, '../../samples/shacl');
  const simpleShaclPath = path.join(samplesDir, 'simple-shacl.ttl');
  const simpleJsonLdPath = path.join(samplesDir, 'simple-shacl.jsonld');
  const complexShaclPath = path.join(samplesDir, 'complex-shacl.ttl');

  const defaultOptions: ToJsonSchemaOptions = {
    input: simpleShaclPath,
    fromClipboard: false,
    jsonLd: false,
    mode: 'single',
    excludeShaclExtensions: false,
  };

  describe('constructor validation', () => {
    it('should throw error when mode is multi and output is not provided', () => {
      expect(() => {
        new ShaclToJsonSchema({
          ...defaultOptions,
          mode: 'multi',
          output: undefined,
        });
      }).toThrow('Output directory is required when using multi mode.');
    });

    it('should not throw error when mode is multi and output is provided', () => {
      expect(() => {
        new ShaclToJsonSchema({
          ...defaultOptions,
          mode: 'multi',
          output: '/tmp/output',
        });
      }).not.toThrow();
    });

    it('should not throw error when mode is single', () => {
      expect(() => {
        new ShaclToJsonSchema(defaultOptions);
      }).not.toThrow();
    });
  });

  describe('execute with single mode', () => {
    it('should convert SHACL Turtle to JSON Schema and output to stdout', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new ShaclToJsonSchema(defaultOptions);
      await converter.convert();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      const schema = JSON.parse(output) as JsonSchemaObjectType;

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$defs).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should convert SHACL Turtle to JSON Schema and write to file', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-test-'));
      const outputPath = path.join(tempDir, 'schema.json');

      try {
        const converter = new ShaclToJsonSchema({
          ...defaultOptions,
          output: outputPath,
        });
        await converter.convert();

        expect(fs.existsSync(outputPath)).toBe(true);
        const content = fs.readFileSync(outputPath, 'utf-8');
        const schema = JSON.parse(content) as JsonSchemaObjectType;

        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema.$defs).toBeDefined();
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should include x-shacl-prefixes by default', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new ShaclToJsonSchema(defaultOptions);
      await converter.convert();

      const output = consoleSpy.mock.calls[0][0] as string;
      const schema = JSON.parse(output) as JsonSchemaObjectType;

      expect(schema['x-shacl-prefixes']).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should exclude x-shacl-prefixes when excludeShaclExtensions is true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new ShaclToJsonSchema({
        ...defaultOptions,
        excludeShaclExtensions: true,
      });
      await converter.convert();

      const output = consoleSpy.mock.calls[0][0] as string;
      const schema = JSON.parse(output) as JsonSchemaObjectType;

      expect(schema['x-shacl-prefixes']).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  describe('execute with multi mode', () => {
    it('should write multiple schema files to output directory', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-multi-test-'));

      try {
        const converter = new ShaclToJsonSchema({
          ...defaultOptions,
          mode: 'multi',
          output: tempDir,
        });
        await converter.convert();

        const files = fs.readdirSync(tempDir);
        expect(files.length).toBeGreaterThan(0);
        expect(files.some((f) => f.endsWith('.json'))).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should create output directory if it does not exist', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-multi-test-'));
      const outputDir = path.join(tempDir, 'nested', 'output');

      try {
        const converter = new ShaclToJsonSchema({
          ...defaultOptions,
          mode: 'multi',
          output: outputDir,
        });
        await converter.convert();

        expect(fs.existsSync(outputDir)).toBe(true);
        const files = fs.readdirSync(outputDir);
        expect(files.length).toBeGreaterThan(0);
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should convert internal $refs to external file references', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-multi-ref-test-'));

      try {
        const converter = new ShaclToJsonSchema({
          ...defaultOptions,
          input: complexShaclPath,
          mode: 'multi',
          output: tempDir,
        });
        await converter.convert();

        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          const content = fs.readFileSync(path.join(tempDir, file), 'utf-8');
          expect(content).not.toContain('#/$defs/');
        }
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  describe('JSON-LD input', () => {
    it('should parse JSON-LD file when jsonLd option is true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new ShaclToJsonSchema({
        ...defaultOptions,
        input: simpleJsonLdPath,
        jsonLd: true,
      });
      await converter.convert();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      const schema = JSON.parse(output) as JsonSchemaObjectType;

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$defs).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should produce equivalent output for Turtle and JSON-LD formats', async () => {
      const turtleSpy = jest.spyOn(console, 'log').mockImplementation();
      const turtleConverter = new ShaclToJsonSchema(defaultOptions);
      await turtleConverter.convert();
      const turtleOutput = turtleSpy.mock.calls[0][0] as string;
      turtleSpy.mockRestore();

      const jsonLdSpy = jest.spyOn(console, 'log').mockImplementation();
      const jsonLdConverter = new ShaclToJsonSchema({
        ...defaultOptions,
        input: simpleJsonLdPath,
        jsonLd: true,
      });
      await jsonLdConverter.convert();
      const jsonLdOutput = jsonLdSpy.mock.calls[0][0] as string;
      jsonLdSpy.mockRestore();

      const turtleSchema = JSON.parse(turtleOutput) as JsonSchemaObjectType;
      const jsonLdSchema = JSON.parse(jsonLdOutput) as JsonSchemaObjectType;

      expect(turtleSchema.$schema).toBe(jsonLdSchema.$schema);
      expect(Object.keys(turtleSchema.$defs ?? {}).length).toBe(
        Object.keys(jsonLdSchema.$defs ?? {}).length
      );
    });
  });

  describe('error handling', () => {
    it('should throw error when input file does not exist', async () => {
      const converter = new ShaclToJsonSchema({
        ...defaultOptions,
        input: '/nonexistent/file.ttl',
      });

      await expect(converter.convert()).rejects.toThrow('File not found');
    });

    it('should throw error when input is not provided and not from clipboard', async () => {
      const converter = new ShaclToJsonSchema({
        ...defaultOptions,
        input: undefined,
      });

      await expect(converter.convert()).rejects.toThrow('File not found');
    });
  });
});
