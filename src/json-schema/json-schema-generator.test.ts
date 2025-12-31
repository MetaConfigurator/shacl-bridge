import JsonSchemaGenerator from './json-schema-generator';
import {
  GeneratorConfig,
  isMultiSchemaResult,
  isSingleSchemaResult,
  JsonSchema,
  Mode,
} from './types';
import { StoreBuilder } from '../util/store-builder';
import {
  RDF_FIRST,
  RDF_NIL,
  RDF_REST,
  SHACL_CLASS,
  SHACL_DATATYPE,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_MIN_LENGTH,
  SHACL_NODE_SHAPE,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PATTERN,
  SHACL_PROPERTY,
  SHACL_TARGET_CLASS,
  XSD_STRING,
} from '../util/rdf-terms';
import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../ir/intermediate-representation-builder';
import { ShaclParser } from '../shacl/shacl-parser';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('JsonSchemaGenerator', () => {
  describe('single mode', () => {
    const singleConfig: GeneratorConfig = {
      mode: Mode.Single,
      includeMetadata: false,
      preserveRdfMetadata: false,
    };

    it('should generate schema with $schema draft 2020-12', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .write();
      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(ir) as JsonSchema;

      expect(isSingleSchemaResult(result)).toBe(true);
      expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    });

    it('should inline blank nodes in logical constraints instead of creating $refs', async () => {
      // Shape with sh:or that references blank node shapes
      const shape = 'http://example.org/IdentifierShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_NODE_SHAPE)
        // sh:or with two blank nodes
        .triple(shape, SHACL_OR, 'orList', true)
        .bothBlank('orList', RDF_FIRST, 'b1')
        .bothBlank('orList', RDF_REST, 'orList2')
        .bothBlank('orList2', RDF_FIRST, 'b2')
        .blank('orList2', RDF_REST, RDF_NIL)
        // First alternative: blank node with ssn property
        .bothBlank('b1', SHACL_PROPERTY, 'prop1')
        .blank('prop1', SHACL_PATH, 'http://example.org/ssn')
        .literalString('prop1', SHACL_PATTERN, '^[0-9]{3}$', true)
        .literalInt('prop1', SHACL_MIN_COUNT, 1, true)
        // Second alternative: blank node with passport property
        .bothBlank('b2', SHACL_PROPERTY, 'prop2')
        .blank('prop2', SHACL_PATH, 'http://example.org/passport')
        .literalInt('prop2', SHACL_MIN_LENGTH, 6, true)
        .literalInt('prop2', SHACL_MIN_COUNT, 1, true)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(ir) as JsonSchema;

      expect(isSingleSchemaResult(result)).toBe(true);
      // Named shape should be in $defs
      expect(result.$defs?.Identifier).toBeDefined();
      // Blank nodes should NOT be in $defs
      expect(result.$defs?.['n3-1']).toBeUndefined();
      expect(result.$defs?.['n3-2']).toBeUndefined();

      const idShape = result.$defs?.Identifier;
      expect(idShape?.anyOf).toBeDefined();
      expect(idShape?.anyOf).toHaveLength(2);

      // Verify the first alternative is inlined
      expect(idShape?.anyOf?.[0]).not.toHaveProperty('$ref');
      expect(idShape?.anyOf?.[0]).toHaveProperty('type', 'object');
      expect(idShape?.anyOf?.[0]).toHaveProperty('properties');
      expect(idShape?.anyOf?.[0].properties?.ssn).toBeDefined();
      // Blank node titles should be removed
      expect(idShape?.anyOf?.[0]).not.toHaveProperty('title');

      // Verify the second alternative is inlined
      expect(idShape?.anyOf?.[1]).not.toHaveProperty('$ref');
      expect(idShape?.anyOf?.[1]).toHaveProperty('type', 'object');
      expect(idShape?.anyOf?.[1]).toHaveProperty('properties');
      expect(idShape?.anyOf?.[1].properties?.passport).toBeDefined();
      // Blank node titles should be removed
      expect(idShape?.anyOf?.[1]).not.toHaveProperty('title');
    });

    it('should place all shapes in $defs', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .shape('http://example.org/AddressShape', SHACL_NODE_SHAPE)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(ir) as JsonSchema;

      expect(isSingleSchemaResult(result)).toBe(true);
      expect(result.$defs).toBeDefined();
      expect(result.$defs?.Person).toBeDefined();
      expect(result.$defs?.Address).toBeDefined();
    });

    it('should set root $ref to first shape', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(ir) as JsonSchema;

      expect(isSingleSchemaResult(result)).toBe(true);
      expect(result.$ref).toBe('#/$defs/Person');
    });

    it('should handle empty model', async () => {
      const content = await new StoreBuilder().write();
      const ir = await getIr(content);

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(ir) as JsonSchema;

      expect(isSingleSchemaResult(result)).toBe(true);
      expect(result.$defs).toBeUndefined();
      expect(result.$ref).toBeUndefined();
    });

    it('should convert shape with properties', async () => {
      const shape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_NODE_SHAPE)
        .triple(shape, SHACL_PROPERTY, 'prop1', true)
        .blank('prop1', SHACL_PATH, 'http://example.org/name')
        .blank('prop1', SHACL_DATATYPE, XSD_STRING)
        .literalInt('prop1', SHACL_MIN_COUNT, 1, true)
        .literalInt('prop1', SHACL_MAX_COUNT, 1, true)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(ir) as JsonSchema;

      expect(isSingleSchemaResult(result)).toBe(true);
      const personSchema = result.$defs?.Person;
      expect(personSchema?.properties?.name).toBeDefined();
      expect(personSchema?.properties?.name.type).toBe('string');
      expect(personSchema?.required).toContain('name');
    });
  });

  describe('multi mode', () => {
    const multiConfig: GeneratorConfig = {
      mode: Mode.Multi,
      includeMetadata: false,
      preserveRdfMetadata: false,
    };

    it('should return Map of schemas', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .shape('http://example.org/AddressShape', SHACL_NODE_SHAPE)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(ir) as { schemas: Map<string, JsonSchema> };
      expect(isMultiSchemaResult(result)).toBe(true);
      expect(result.schemas.size).toBe(2);
      expect(result.schemas.has('Person')).toBe(true);
      expect(result.schemas.has('Address')).toBe(true);
    });

    it('should include $schema in each schema', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(ir) as { schemas: Map<string, JsonSchema> };

      expect(isMultiSchemaResult(result)).toBe(true);
      const personSchema = result.schemas.get('Person');
      expect(personSchema?.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    });

    it('should include $id for each schema', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .write();

      const ir = await getIr(content);
      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(ir) as { schemas: Map<string, JsonSchema> };

      expect(isMultiSchemaResult(result)).toBe(true);
      const personSchema = result.schemas.get('Person');
      expect(personSchema?.$id).toBe('Person.json');
    });

    describe('cross-references', () => {
      it('should generate correct $ref for class references in single mode', async () => {
        const singleConfig: GeneratorConfig = {
          mode: Mode.Single,
          includeMetadata: false,
        };

        const shape = 'http://example.org/PersonShape';
        const content = await new StoreBuilder()
          .shape(shape, SHACL_NODE_SHAPE)
          .triple(shape, SHACL_PROPERTY, 'prop1', true)
          .blank('prop1', SHACL_PATH, 'http://example.org/address')
          .blank('prop1', SHACL_CLASS, 'http://example.org/Address')
          .literalInt('prop1', SHACL_MAX_COUNT, 1, true)
          .write();

        const ir = await getIr(content);
        const generator = new JsonSchemaGenerator(singleConfig);
        const result = generator.generate(ir) as JsonSchema;

        expect(isSingleSchemaResult(result)).toBe(true);
        const personSchema = result.$defs?.Person;
        expect(personSchema).toBeDefined();
        const addressProp = personSchema?.properties?.address;
        expect(addressProp).toBeDefined();
        expect(addressProp?.$ref).toBe('#/$defs/Address');
      });

      it('should generate file-based $ref in multi mode', async () => {
        const multiConfig: GeneratorConfig = {
          mode: Mode.Multi,
          includeMetadata: false,
        };

        const shape = 'http://example.org/PersonShape';
        const content = await new StoreBuilder()
          .shape(shape, SHACL_NODE_SHAPE)
          .triple(shape, SHACL_PROPERTY, 'prop1', true)
          .blank('prop1', SHACL_PATH, 'http://example.org/address')
          .blank('prop1', SHACL_CLASS, 'http://example.org/Address')
          .literalInt('prop1', SHACL_MAX_COUNT, 1, true)
          .write();

        const ir = await getIr(content);
        const generator = new JsonSchemaGenerator(multiConfig);
        const result = generator.generate(ir) as { schemas: Map<string, JsonSchema> };

        expect(isMultiSchemaResult(result)).toBe(true);
        const personSchema = result.schemas.get('Person');
        const addressProp = personSchema?.properties?.address;
        expect(addressProp?.$ref).toBe('Address.json');
      });
    });

    describe('metadata configuration', () => {
      it('should include SHACL metadata when configured', async () => {
        const config: GeneratorConfig = {
          mode: Mode.Single,
          includeMetadata: true,
        };

        const shape = 'http://example.org/PersonShape';
        const content = await new StoreBuilder()
          .shape(shape, SHACL_NODE_SHAPE)
          .triple(shape, SHACL_TARGET_CLASS, 'http://example.org/Person', false)
          .write();

        const ir = await getIr(content);
        const generator = new JsonSchemaGenerator(config);
        const result = generator.generate(ir) as JsonSchema;

        expect(isSingleSchemaResult(result)).toBe(true);
        const personSchema = result.$defs?.Person;
        expect(personSchema?.['x-shacl-targetClass']).toEqual(['http://example.org/Person']);
      });
    });
  });
});
