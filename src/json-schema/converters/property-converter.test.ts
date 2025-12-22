import { PropertyConverter } from './property-converter';
import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { SHAPE_TYPE } from '../../ir/meta-model/shape';

describe('PropertyConverter', () => {
  let converter: PropertyConverter;

  beforeEach(() => {
    converter = new PropertyConverter();
  });

  describe('basic property conversion', () => {
    it('should convert a simple property shape with path', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/name',
        },
        coreConstraints: {},
      };

      const result = converter.convert(propertyShape);

      expect(result.propertyName).toBe('name');
      expect(result.schema).toBeDefined();
    });

    it('should extract property name from path URI', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://schema.org/givenName',
        },
        coreConstraints: {},
      };

      const result = converter.convert(propertyShape);
      expect(result.propertyName).toBe('givenName');
    });

    it('should handle path with hash fragment', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://xmlns.com/foaf/0.1/#name',
        },
        coreConstraints: {},
      };

      const result = converter.convert(propertyShape);
      expect(result.propertyName).toBe('name');
    });
  });

  describe('datatype conversion', () => {
    it('should convert xsd:string datatype', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/name',
        },
        coreConstraints: {
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('string');
    });

    it('should convert xsd:integer datatype', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/age',
        },
        coreConstraints: {
          datatype: 'http://www.w3.org/2001/XMLSchema#integer',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('integer');
    });

    it('should convert xsd:dateTime with format', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/createdAt',
        },
        coreConstraints: {
          datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('string');
      expect(result.schema.format).toBe('date-time');
    });
  });

  describe('constraint conversion', () => {
    it('should apply minLength constraint', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/name',
        },
        coreConstraints: {
          minLength: 1,
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.minLength).toBe(1);
    });

    it('should apply pattern constraint', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/email',
        },
        coreConstraints: {
          pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.pattern).toBe('^[a-z]+@[a-z]+\\.[a-z]+$');
    });

    it('should apply numeric constraints', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/age',
        },
        coreConstraints: {
          minInclusive: 0,
          maxInclusive: 150,
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.minimum).toBe(0);
      expect(result.schema.maximum).toBe(150);
    });
  });

  describe('cardinality handling', () => {
    it('should mark property as required when minCount >= 1', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/name',
        },
        coreConstraints: {
          minCount: 1,
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.required).toBe(true);
    });

    it('should not mark property as required when minCount is 0', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/nickname',
        },
        coreConstraints: {
          minCount: 0,
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.required).toBe(false);
    });

    it('should not mark property as required when minCount is undefined', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/nickname',
        },
        coreConstraints: {},
      };

      const result = converter.convert(propertyShape);
      expect(result.required).toBe(false);
    });

    it('should wrap in array when maxCount > 1', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/tags',
        },
        coreConstraints: {
          maxCount: 10,
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('array');
      expect(result.schema.items).toBeDefined();
      expect(result.schema.items?.type).toBe('string');
      expect(result.schema.maxItems).toBe(10);
    });

    it('should wrap in array when maxCount is undefined (unbounded)', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/tags',
        },
        coreConstraints: {
          minCount: 0,
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('array');
      expect(result.schema.items).toBeDefined();
    });

    it('should not wrap in array when maxCount is 1', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/name',
        },
        coreConstraints: {
          maxCount: 1,
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('string');
    });

    it('should set minItems from minCount for arrays', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/tags',
        },
        coreConstraints: {
          minCount: 2,
          maxCount: 5,
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('array');
      expect(result.schema.minItems).toBe(2);
      expect(result.schema.maxItems).toBe(5);
    });
  });

  describe('class reference', () => {
    it('should convert sh:class to $ref', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/address',
        },
        coreConstraints: {
          class: 'http://example.org/Address',
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.$ref).toBe('#/$defs/Address');
    });

    it('should handle class reference with array cardinality', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/addresses',
        },
        coreConstraints: {
          class: 'http://example.org/Address',
          maxCount: 5,
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.type).toBe('array');
      expect(result.schema.items?.$ref).toBe('#/$defs/Address');
    });
  });

  describe('enum values', () => {
    it('should convert sh:in to enum', () => {
      const propertyShape: ShapeDefinition = {
        nodeKey: 'n3-0',
        shape: {
          type: SHAPE_TYPE.PROPERTY_SHAPE,
          path: 'http://example.org/status',
        },
        coreConstraints: {
          in: ['active', 'inactive', 'pending'],
        },
      };

      const result = converter.convert(propertyShape);
      expect(result.schema.enum).toEqual(['active', 'inactive', 'pending']);
    });
  });
});
