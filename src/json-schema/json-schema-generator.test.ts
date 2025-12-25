import { JsonSchemaGenerator } from './json-schema-generator';
import { Model } from '../ir/meta-model/model';
import { SHAPE_TYPE } from '../ir/meta-model/shape';
import { GeneratorConfig, isMultiSchemaResult, isSingleSchemaResult } from './types';

describe('JsonSchemaGenerator', () => {
  describe('single mode', () => {
    const singleConfig: GeneratorConfig = {
      mode: 'single',
      includeMetadata: false,
      preserveRdfMetadata: false,
    };

    it('should generate schema with $schema draft 2020-12', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        expect(result.schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      }
    });

    it('should inline blank nodes in logical constraints instead of creating $refs', () => {
      // Shape with sh:or that references blank node shapes
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/IdentifierShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {
              or: ['n3-1', 'n3-2'], // References to blank nodes
            },
            dependentShapes: [
              {
                nodeKey: 'n3-1',
                shape: { type: SHAPE_TYPE.NODE_SHAPE },
                coreConstraints: {},
                dependentShapes: [
                  {
                    nodeKey: 'n3-prop-1',
                    shape: { type: SHAPE_TYPE.PROPERTY_SHAPE, path: 'http://example.org/ssn' },
                    coreConstraints: { pattern: '^[0-9]{3}$', minCount: 1 },
                  },
                ],
              },
              {
                nodeKey: 'n3-2',
                shape: { type: SHAPE_TYPE.NODE_SHAPE },
                coreConstraints: {},
                dependentShapes: [
                  {
                    nodeKey: 'n3-prop-2',
                    shape: {
                      type: SHAPE_TYPE.PROPERTY_SHAPE,
                      path: 'http://example.org/passport',
                    },
                    coreConstraints: { minLength: 6, minCount: 1 },
                  },
                ],
              },
            ],
          },
        ],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        // Named shape should be in $defs
        expect(result.schema.$defs?.IdentifierShape).toBeDefined();

        // Blank nodes should NOT be in $defs
        expect(result.schema.$defs?.['n3-1']).toBeUndefined();
        expect(result.schema.$defs?.['n3-2']).toBeUndefined();

        // The main shape should have anyOf with inlined schemas (not $refs)
        const idShape = result.schema.$defs?.IdentifierShape;
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
      }
    });

    it('should place all shapes in $defs', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
          {
            nodeKey: 'http://example.org/AddressShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        expect(result.schema.$defs).toBeDefined();
        expect(result.schema.$defs?.PersonShape).toBeDefined();
        expect(result.schema.$defs?.AddressShape).toBeDefined();
      }
    });

    it('should set root $ref to first shape', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        expect(result.schema.$ref).toBe('#/$defs/PersonShape');
      }
    });

    it('should handle empty model', () => {
      const model: Model = {
        shapeDefinitions: [],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        expect(result.schema.$defs).toBeUndefined();
        expect(result.schema.$ref).toBeUndefined();
      }
    });

    it('should convert shape with properties', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
            dependentShapes: [
              {
                nodeKey: 'n3-0',
                shape: {
                  type: SHAPE_TYPE.PROPERTY_SHAPE,
                  path: 'http://example.org/name',
                },
                coreConstraints: {
                  datatype: 'http://www.w3.org/2001/XMLSchema#string',
                  minCount: 1,
                  maxCount: 1,
                },
              },
            ],
          },
        ],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const personSchema = result.schema.$defs?.PersonShape;
        expect(personSchema?.properties?.name).toBeDefined();
        expect(personSchema?.properties?.name.type).toBe('string');
        expect(personSchema?.required).toContain('name');
      }
    });
  });

  describe('multi mode', () => {
    const multiConfig: GeneratorConfig = {
      mode: 'multi',
      includeMetadata: false,
      preserveRdfMetadata: false,
    };

    it('should return Map of schemas', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
          {
            nodeKey: 'http://example.org/AddressShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(model);

      expect(isMultiSchemaResult(result)).toBe(true);
      if (isMultiSchemaResult(result)) {
        expect(result.schemas.size).toBe(2);
        expect(result.schemas.has('PersonShape')).toBe(true);
        expect(result.schemas.has('AddressShape')).toBe(true);
      }
    });

    it('should include $schema in each schema', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(model);

      expect(isMultiSchemaResult(result)).toBe(true);
      if (isMultiSchemaResult(result)) {
        const personSchema = result.schemas.get('PersonShape');
        expect(personSchema?.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      }
    });

    it('should include $id for each schema', () => {
      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(model);

      expect(isMultiSchemaResult(result)).toBe(true);
      if (isMultiSchemaResult(result)) {
        const personSchema = result.schemas.get('PersonShape');
        expect(personSchema?.$id).toBe('PersonShape.json');
      }
    });

    it('should handle empty model', () => {
      const model: Model = {
        shapeDefinitions: [],
      };

      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(model);

      expect(isMultiSchemaResult(result)).toBe(true);
      if (isMultiSchemaResult(result)) {
        expect(result.schemas.size).toBe(0);
      }
    });
  });

  describe('cross-references', () => {
    it('should generate correct $ref for class references in single mode', () => {
      const singleConfig: GeneratorConfig = {
        mode: 'single',
        includeMetadata: false,
      };

      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
            dependentShapes: [
              {
                nodeKey: 'n3-0',
                shape: {
                  type: SHAPE_TYPE.PROPERTY_SHAPE,
                  path: 'http://example.org/address',
                },
                coreConstraints: {
                  class: 'http://example.org/Address',
                  maxCount: 1,
                },
              },
            ],
          },
        ],
      };

      const generator = new JsonSchemaGenerator(singleConfig);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const personSchema = result.schema.$defs?.PersonShape;
        const addressProp = personSchema?.properties?.address;
        expect(addressProp?.$ref).toBe('#/$defs/Address');
      }
    });

    it('should generate file-based $ref in multi mode', () => {
      const multiConfig: GeneratorConfig = {
        mode: 'multi',
        includeMetadata: false,
      };

      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: { type: SHAPE_TYPE.NODE_SHAPE },
            coreConstraints: {},
            dependentShapes: [
              {
                nodeKey: 'n3-0',
                shape: {
                  type: SHAPE_TYPE.PROPERTY_SHAPE,
                  path: 'http://example.org/address',
                },
                coreConstraints: {
                  class: 'http://example.org/Address',
                  maxCount: 1,
                },
              },
            ],
          },
        ],
      };

      const generator = new JsonSchemaGenerator(multiConfig);
      const result = generator.generate(model);

      expect(isMultiSchemaResult(result)).toBe(true);
      if (isMultiSchemaResult(result)) {
        const personSchema = result.schemas.get('PersonShape');
        const addressProp = personSchema?.properties?.address;
        expect(addressProp?.$ref).toBe('Address.json');
      }
    });
  });

  describe('metadata configuration', () => {
    it('should include SHACL metadata when configured', () => {
      const config: GeneratorConfig = {
        mode: 'single',
        includeMetadata: true,
      };

      const model: Model = {
        shapeDefinitions: [
          {
            nodeKey: 'http://example.org/PersonShape',
            shape: {
              type: SHAPE_TYPE.NODE_SHAPE,
              targetClass: 'http://example.org/Person',
            },
            coreConstraints: {},
          },
        ],
      };

      const generator = new JsonSchemaGenerator(config);
      const result = generator.generate(model);

      expect(isSingleSchemaResult(result)).toBe(true);
      if (isSingleSchemaResult(result)) {
        const personSchema = result.schema.$defs?.PersonShape;
        expect(personSchema?.['x-shacl-targetClass']).toBe('http://example.org/Person');
      }
    });
  });
});
