import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonSchemaToShacl } from './json-schema-to-shacl';
import { ToShaclOptions } from './cli-constants';

describe('JsonSchemaToShacl', () => {
  const samplesDir = path.join(__dirname, '../../samples/json-schema');
  const simpleJsonSchemaPath = path.join(samplesDir, 'complex-system-config.json');

  const defaultOptions: ToShaclOptions = {
    input: simpleJsonSchemaPath,
    fromClipboard: false,
    jsonLd: false,
  };

  describe('constructor validation', () => {
    it('should throw error when input file does not exist', () => {
      expect(() => {
        new JsonSchemaToShacl({
          ...defaultOptions,
          input: '/nonexistent/file.json',
        });
      }).toThrow('File not found: /nonexistent/file.json');
    });

    it('should not throw error when input file exists', () => {
      expect(() => {
        new JsonSchemaToShacl(defaultOptions);
      }).not.toThrow();
    });

    it('should not throw error when fromClipboard is true and input is not provided', () => {
      expect(() => {
        new JsonSchemaToShacl({
          ...defaultOptions,
          input: undefined,
          fromClipboard: true,
        });
      }).not.toThrow();
    });
  });

  describe('execute with Turtle output', () => {
    it('should convert JSON Schema to SHACL Turtle and output to stdout', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new JsonSchemaToShacl(defaultOptions);
      await converter.convert();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;

      expect(output).toContain('sh:NodeShape');
      expect(output).toContain('sh:property');

      consoleSpy.mockRestore();
    });

    it('should convert JSON Schema to SHACL Turtle and write to file', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-to-turtle-test-'));
      const outputPath = path.join(tempDir, 'shapes.ttl');

      try {
        const converter = new JsonSchemaToShacl({
          ...defaultOptions,
          output: outputPath,
        });
        await converter.convert();

        expect(fs.existsSync(outputPath)).toBe(true);
        const content = fs.readFileSync(outputPath, 'utf-8');

        expect(content).toContain('sh:NodeShape');
        expect(content).toContain('sh:property');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  describe('execute with JSON-LD output', () => {
    it('should convert JSON Schema to SHACL JSON-LD and output to stdout', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new JsonSchemaToShacl({
        ...defaultOptions,
        jsonLd: true,
      });
      await converter.convert();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      const jsonLd = JSON.parse(output) as Record<string, unknown>;

      expect(jsonLd['@context']).toBeDefined();
      expect(output).toContain('NodeShape');

      consoleSpy.mockRestore();
    });

    it('should convert JSON Schema to SHACL JSON-LD and write to file', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-to-jsonld-test-'));
      const outputPath = path.join(tempDir, 'shapes.jsonld');

      try {
        const converter = new JsonSchemaToShacl({
          ...defaultOptions,
          jsonLd: true,
          output: outputPath,
        });
        await converter.convert();

        expect(fs.existsSync(outputPath)).toBe(true);
        const content = fs.readFileSync(outputPath, 'utf-8');
        const jsonLd = JSON.parse(content) as Record<string, unknown>;

        expect(jsonLd['@context']).toBeDefined();
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  describe('baseUri option', () => {
    it('should use provided baseUri for generated shapes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new JsonSchemaToShacl({
        ...defaultOptions,
        baseUri: 'https://example.com/shapes/',
      });
      await converter.convert();

      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('https://example.com/shapes/');

      consoleSpy.mockRestore();
    });

    it('should append schema $id basename to baseUri', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const converter = new JsonSchemaToShacl({
        ...defaultOptions,
        baseUri: 'https://custom.org/',
      });
      await converter.convert();

      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('https://custom.org/');

      consoleSpy.mockRestore();
    });
  });

  describe('extractBaseUri', () => {
    it('should extract base URI with hash fragment', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'base-uri-test-'));
      const inputPath = path.join(tempDir, 'schema.json');
      const schema = {
        $id: 'https://example.org/schema#Shape',
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      fs.writeFileSync(inputPath, JSON.stringify(schema));

      try {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const converter = new JsonSchemaToShacl({
          ...defaultOptions,
          input: inputPath,
        });
        await converter.convert();

        const output = consoleSpy.mock.calls[0][0] as string;
        expect(output).toContain('https://example.org/schema#');

        consoleSpy.mockRestore();
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should extract base URI with slash', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'base-uri-test-'));
      const inputPath = path.join(tempDir, 'schema.json');
      const schema = {
        $id: 'https://example.org/schemas/PersonShape',
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      fs.writeFileSync(inputPath, JSON.stringify(schema));

      try {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const converter = new JsonSchemaToShacl({
          ...defaultOptions,
          input: inputPath,
        });
        await converter.convert();

        const output = consoleSpy.mock.calls[0][0] as string;
        expect(output).toContain('https://example.org/schemas/');

        consoleSpy.mockRestore();
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should use default base URI when $id is not provided', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'base-uri-test-'));
      const inputPath = path.join(tempDir, 'schema.json');
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      fs.writeFileSync(inputPath, JSON.stringify(schema));

      try {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const converter = new JsonSchemaToShacl({
          ...defaultOptions,
          input: inputPath,
        });
        await converter.convert();

        const output = consoleSpy.mock.calls[0][0] as string;
        expect(output).toContain('http://example.org/');

        consoleSpy.mockRestore();
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  describe('error handling', () => {
    it('should throw error when input is not provided and not from clipboard', async () => {
      const converter = new JsonSchemaToShacl({
        ...defaultOptions,
        input: undefined,
        fromClipboard: false,
      });

      await expect(converter.convert()).rejects.toThrow('Input file is required');
    });
  });
});
