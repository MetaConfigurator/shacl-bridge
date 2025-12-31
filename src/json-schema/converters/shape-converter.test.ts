import { ShapeConverter } from './shape-converter';
import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { SEVERITY, SHAPE_TYPE } from '../../ir/meta-model/shape';
import { GeneratorConfig, Mode } from '../types';

describe('ShapeConverter', () => {
  const defaultConfig: GeneratorConfig = {
    mode: Mode.Single,
    includeMetadata: false,
    preserveRdfMetadata: false,
  };

  describe('basic NodeShape conversion', () => {
    it('should convert empty NodeShape to object type', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {},
      };

      const result = converter.convert(shape);

      expect(result.type).toBe('object');
    });
  });

  describe('property handling', () => {
    it('should convert dependent PropertyShapes to properties', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
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
              maxCount: 1,
            },
          },
        ],
      };

      const result = converter.convert(shape);

      expect(result.properties).toBeDefined();
      expect(result.properties?.name).toBeDefined();
      expect(result.properties?.name.type).toBe('string');
    });

    it('should add required properties to required array', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {},
        dependentShapes: [
          {
            nodeKey: 'n3-0',
            shape: {
              type: SHAPE_TYPE.PROPERTY_SHAPE,
              path: 'http://example.org/name',
            },
            coreConstraints: {
              minCount: 1,
              maxCount: 1,
            },
          },
          {
            nodeKey: 'n3-1',
            shape: {
              type: SHAPE_TYPE.PROPERTY_SHAPE,
              path: 'http://example.org/nickname',
            },
            coreConstraints: {
              maxCount: 1,
            },
          },
        ],
      };

      const result = converter.convert(shape);

      expect(result.required).toContain('name');
      expect(result.required).not.toContain('nickname');
    });
  });

  describe('sh:closed handling', () => {
    it('should set additionalProperties to false when closed', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {
          closed: true,
        },
      };

      const result = converter.convert(shape);

      expect(result.additionalProperties).toBe(false);
    });

    it('should not set additionalProperties when not closed', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {
          closed: false,
        },
      };

      const result = converter.convert(shape);

      expect(result.additionalProperties).toBeUndefined();
    });
  });

  describe('logical operators', () => {
    it('should convert sh:or to anyOf', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonOrOrgShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {
          or: ['http://example.org/PersonShape', 'http://example.org/OrganizationShape'],
        },
      };

      const result = converter.convert(shape);

      expect(result.anyOf).toBeDefined();
      expect(result.anyOf).toHaveLength(2);
      expect(result.anyOf?.[0].$ref).toBe('#/$defs/PersonShape');
      expect(result.anyOf?.[1].$ref).toBe('#/$defs/OrganizationShape');
    });

    it('should convert sh:and to allOf', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/EmployeeShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {
          and: ['http://example.org/PersonShape', 'http://example.org/HasJobShape'],
        },
      };

      const result = converter.convert(shape);

      expect(result.allOf).toBeDefined();
      expect(result.allOf).toHaveLength(2);
    });

    it('should convert sh:xone to oneOf', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/ExclusiveShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {
          xone: ['http://example.org/TypeA', 'http://example.org/TypeB'],
        },
      };

      const result = converter.convert(shape);

      expect(result.oneOf).toBeDefined();
      expect(result.oneOf).toHaveLength(2);
    });

    it('should convert sh:not to not', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/NotPersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {
          not: ['http://example.org/PersonShape'],
        },
      };

      const result = converter.convert(shape);

      expect(result.not).toBeDefined();
      expect(result.not?.$ref).toBe('#/$defs/PersonShape');
    });
  });

  describe('metadata handling', () => {
    it('should include targetClasses when includeMetadata is true', () => {
      const config: GeneratorConfig = {
        ...defaultConfig,
        includeMetadata: true,
      };
      const converter = new ShapeConverter(config);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
          targetClasses: ['http://example.org/Person'],
        },
        coreConstraints: {},
      };

      const result = converter.convert(shape);

      expect(result['x-shacl-targetClass']).toEqual(['http://example.org/Person']);
    });

    it('should include severity when includeMetadata is true', () => {
      const config: GeneratorConfig = {
        ...defaultConfig,
        includeMetadata: true,
      };
      const converter = new ShapeConverter(config);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
          severity: SEVERITY.WARNING,
        },
        coreConstraints: {},
      };

      const result = converter.convert(shape);

      expect(result['x-shacl-severity']).toBe('sh:Warning');
    });

    it('should include message when includeMetadata is true', () => {
      const config: GeneratorConfig = {
        ...defaultConfig,
        includeMetadata: true,
      };
      const converter = new ShapeConverter(config);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
          message: 'Person validation failed',
        },
        coreConstraints: {},
      };

      const result = converter.convert(shape);

      expect(result['x-shacl-message']).toBe('Person validation failed');
    });

    it('should not include metadata when includeMetadata is false', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
          targetClasses: ['http://example.org/Person'],
          severity: SEVERITY.VIOLATION,
          message: 'Test message',
        },
        coreConstraints: {},
      };

      const result = converter.convert(shape);

      expect(result['x-shacl-targetClass']).toBeUndefined();
      expect(result['x-shacl-severity']).toBeUndefined();
      expect(result['x-shacl-message']).toBeUndefined();
    });
  });

  describe('RDF metadata preservation', () => {
    it('should include additionalProperties when preserveRdfMetadata is true', () => {
      const config: GeneratorConfig = {
        ...defaultConfig,
        preserveRdfMetadata: true,
      };
      const converter = new ShapeConverter(config);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {},
        additionalProperties: [
          {
            predicate: 'http://purl.org/dc/terms/created',
            value: { type: 'literal', value: '2024-01-01' },
          },
        ],
      };

      const result = converter.convert(shape);

      expect(result['x-rdf-properties']).toBeDefined();
      expect(result['x-rdf-properties']).toHaveLength(1);
      expect(result['x-rdf-properties']?.[0].predicate).toBe('http://purl.org/dc/terms/created');
    });

    it('should not include additionalProperties when preserveRdfMetadata is false', () => {
      const converter = new ShapeConverter(defaultConfig);
      const shape: ShapeDefinition = {
        nodeKey: 'http://example.org/PersonShape',
        shape: {
          type: SHAPE_TYPE.NODE_SHAPE,
        },
        coreConstraints: {},
        additionalProperties: [
          {
            predicate: 'http://purl.org/dc/terms/created',
            value: { type: 'literal', value: '2024-01-01' },
          },
        ],
      };

      const result = converter.convert(shape);

      expect(result['x-rdf-properties']).toBeUndefined();
    });
  });
});
