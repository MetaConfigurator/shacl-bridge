import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';

describe('CLI', () => {
  const cliPath = path.join(__dirname, '../../dist/cli/cli.js');
  const samplesDir = path.join(__dirname, '../../samples/shacl');
  const simpleShaclPath = path.join(samplesDir, 'simple-shacl.ttl');

  const runCli = (args: string): string => {
    return execSync(`node ${cliPath} ${args}`, { encoding: 'utf-8' });
  };

  beforeAll(() => {
    // Ensure the CLI is built
    execSync('npm run build', { cwd: path.join(__dirname, '../..') });
  });

  describe('basic usage', () => {
    it('should output JSON Schema to stdout', () => {
      const output = runCli(`-i ${simpleShaclPath}`);
      const schema = JSON.parse(output) as JsonSchemaObjectType;

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$defs).toBeDefined();
    });

    it('should show help with --help', () => {
      const output = runCli('--help');

      expect(output).toContain('Usage:');
      expect(output).toContain('shacl-bridge');
      expect(output).toContain('--output');
    });

    it('should show version with --version', () => {
      const output = runCli('--version');
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('--output option', () => {
    it('should write to file when --output is specified', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shacl-cli-test-'));
      const outputPath = path.join(tempDir, 'schema.json');

      try {
        runCli(`--input ${simpleShaclPath} --output ${outputPath}`);
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
});
