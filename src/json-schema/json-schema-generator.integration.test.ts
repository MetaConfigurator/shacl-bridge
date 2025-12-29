import * as path from 'path';
import { ShaclParser } from '../shacl/shacl-parser';
import { IntermediateRepresentation } from '../ir/intermediate-representation';
import { JsonSchemaGenerator } from './json-schema-generator';
import { GeneratorConfig, isMultiSchemaResult, isSingleSchemaResult, Mode } from './types';

describe('JsonSchemaGenerator Integration', () => {
  const samplesDir = path.join(__dirname, '../../samples/shacl');

  describe('simple-shacl.ttl', () => {
    it('should generate valid JSON Schema from simple SHACL', async () => {
      const filePath = path.join(samplesDir, 'simple-shacl.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Single,
        includeMetadata: true,
      };

      // Parse SHACL
      const shaclDoc = await new ShaclParser().withPath(filePath).parse();

      // Build IR model
      const modelBuilder = new IntermediateRepresentation(shaclDoc);
      const model = modelBuilder.build();

      // Generate JSON Schema
      const generator = new JsonSchemaGenerator(config);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        // Verify schema structure
        expect(result.schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(result.schema.$defs).toBeDefined();
        expect(result.schema.$defs?.PersonShape).toBeDefined();

        const personSchema = result.schema.$defs?.PersonShape;

        // Verify type and closed
        expect(personSchema?.type).toBe('object');
        expect(personSchema?.additionalProperties).toBe(false);

        // Verify properties exist
        expect(personSchema?.properties).toBeDefined();
        expect(personSchema?.properties?.ssn).toBeDefined();
        expect(personSchema?.properties?.worksFor).toBeDefined();

        // Verify ssn property constraints
        const ssnProp = personSchema?.properties?.ssn;
        expect(ssnProp?.type).toBe('string');
        expect(ssnProp?.pattern).toBe('^\\d{3}-\\d{2}-\\d{4}$');

        // Verify worksFor property has $ref
        const worksForProp = personSchema?.properties?.worksFor;
        expect(worksForProp?.$ref).toBe('#/$defs/Company');

        // Verify metadata
        expect(personSchema?.['x-shacl-targetClass']).toBe('http://xmlns.com/foaf/0.1/Person');
      }
    });
  });

  describe('cardinality-constraints.ttl', () => {
    it('should handle cardinality constraints correctly', async () => {
      const filePath = path.join(samplesDir, 'cardinality-constraints.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Single,
        includeMetadata: false,
      };

      const shaclDoc = await new ShaclParser().withPath(filePath).parse();
      const model = new IntermediateRepresentation(shaclDoc).build();
      const result = new JsonSchemaGenerator(config).generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        expect(result.schema.$defs).toBeDefined();

        // Find any shape with required properties
        const defs = result.schema.$defs ?? {};
        const hasRequiredProps = Object.values(defs).some(
          (schema) => schema.required && schema.required.length > 0
        );
        expect(hasRequiredProps).toBe(true);
      }
    });
  });

  describe('string-constraints.ttl', () => {
    it('should handle string constraints correctly', async () => {
      const filePath = path.join(samplesDir, 'string-constraints.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Single,
        includeMetadata: false,
      };

      const shaclDoc = await new ShaclParser().withPath(filePath).parse();
      const model = new IntermediateRepresentation(shaclDoc).build();
      const result = new JsonSchemaGenerator(config).generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const defs = result.schema.$defs ?? {};

        // Verify that string constraints are present
        const hasStringConstraints = Object.values(defs).some((schema) => {
          const props = schema.properties ?? {};
          return Object.values(props).some(
            (prop) =>
              prop.minLength !== undefined ||
              prop.maxLength !== undefined ||
              prop.pattern !== undefined
          );
        });
        expect(hasStringConstraints).toBe(true);
      }
    });
  });

  describe('logical-constraints.ttl', () => {
    it('should handle logical operators correctly', async () => {
      const filePath = path.join(samplesDir, 'logical-constraints.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Single,
        includeMetadata: false,
      };

      const shaclDoc = await new ShaclParser().withPath(filePath).parse();
      const model = new IntermediateRepresentation(shaclDoc).build();
      const result = new JsonSchemaGenerator(config).generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const defs = result.schema.$defs ?? {};

        // Verify logical operators are present
        const hasLogicalOps = Object.values(defs).some(
          (schema) => schema.anyOf ?? schema.allOf ?? schema.oneOf ?? schema.not
        );
        expect(hasLogicalOps).toBe(true);
      }
    });
  });

  describe('multi mode', () => {
    it('should generate separate schemas in multi mode', async () => {
      const filePath = path.join(samplesDir, 'simple-shacl.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Multi,
        includeMetadata: false,
      };

      const shaclDoc = await new ShaclParser().withPath(filePath).parse();
      const model = new IntermediateRepresentation(shaclDoc).build();
      const result = new JsonSchemaGenerator(config).generate(model);

      expect(isMultiSchemaResult(result)).toBe(true);
      if (isMultiSchemaResult(result)) {
        expect(result.schemas.size).toBeGreaterThan(0);

        // Each schema should have $schema and $id
        for (const [name, schema] of result.schemas) {
          expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
          expect(schema.$id).toBe(`${name}.json`);
        }
      }
    });
  });

  describe('value-range-constraints.ttl', () => {
    it('should handle numeric range constraints correctly', async () => {
      const filePath = path.join(samplesDir, 'value-range-constraints.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Single,
        includeMetadata: false,
      };

      const shaclDoc = await new ShaclParser().withPath(filePath).parse();
      const model = new IntermediateRepresentation(shaclDoc).build();
      const result = new JsonSchemaGenerator(config).generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const defs = result.schema.$defs ?? {};

        // Verify numeric constraints are present
        const hasNumericConstraints = Object.values(defs).some((schema) => {
          const props = schema.properties ?? {};
          return Object.values(props).some(
            (prop) =>
              prop.minimum !== undefined ||
              prop.maximum !== undefined ||
              prop.exclusiveMinimum !== undefined ||
              prop.exclusiveMaximum !== undefined ||
              prop.items?.minimum !== undefined ||
              prop.items?.maximum !== undefined
          );
        });
        expect(hasNumericConstraints).toBe(true);
      }
    });
  });

  describe('node-kind-constraints.ttl', () => {
    it('should handle nodeKind constraints', async () => {
      const filePath = path.join(samplesDir, 'node-kind-constraints.ttl');
      const config: GeneratorConfig = {
        mode: Mode.Single,
        includeMetadata: true,
      };

      const shaclDoc = await new ShaclParser().withPath(filePath).parse();
      const model = new IntermediateRepresentation(shaclDoc).build();
      const result = new JsonSchemaGenerator(config).generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const defs = result.schema.$defs ?? {};

        // Verify nodeKind is handled (either as format or extension)
        const hasNodeKindHandling = Object.values(defs).some((schema) => {
          const props = schema.properties ?? {};
          return Object.values(props).some((prop) => {
            const hasUri = prop.format === 'uri' || prop.items?.format === 'uri';
            const hasNodeKind =
              prop['x-shacl-nodeKind'] !== undefined ||
              prop.items?.['x-shacl-nodeKind'] !== undefined;
            return hasUri || hasNodeKind;
          });
        });
        expect(hasNodeKindHandling).toBe(true);
      }
    });
  });
});
