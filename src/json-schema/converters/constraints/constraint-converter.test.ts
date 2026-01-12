import { ConstraintConverter } from './constraint-converter';
import { ConversionContext } from './conversion-context';
import { StackElementBuilder } from '../../../stack/stack-element-builder';
import { ShapeDefinition } from '../../../ir/meta-model/shape-definition';
import { StackElement } from '../../../stack/stack-element';
import { NodeKind } from '../../../ir/meta-model/node-kind';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { JsonSchemaObjectBuilder } from '../../meta/json-schema-object-builder';
import { SHAPE_TYPE } from '../../../ir/meta-model/shape';

describe('ConstraintConverter', () => {
  let mockStackElementBuilder: jest.Mocked<StackElementBuilder>;
  let mockContext: ConversionContext;
  let mockShape: ShapeDefinition;
  let processedMap: Map<ShapeDefinition, StackElement>;

  beforeEach(() => {
    // Create a mock shape definition
    mockShape = {
      nodeKey: 'test:Shape',
      shape: { type: SHAPE_TYPE.NODE_SHAPE },
      coreConstraints: {},
      dependentShapes: [],
      additionalProperties: [],
      targets: [],
    };

    // Create mock context
    mockContext = {
      isArray: false,
      setMinItems: false,
      setMaxItems: false,
      required: false,
      isInvalid: false,
      isPrimitive: true,
      constraints: {},
      checkForInvalidNumericConstraint: jest.fn(),
      hasPrimitiveElements: jest.fn(),
      hasPrimitiveNodeKind: jest.fn(),
      hasLogicalConstraints: jest.fn(),
      hasStringConstraints: jest.fn(),
      needToBeArray: jest.fn(),
    } as unknown as ConversionContext;

    // Create processed map
    processedMap = new Map();

    // Create mock stack element builder
    mockStackElementBuilder = {
      getContext: jest.fn().mockReturnValue(mockContext),
      getShape: jest.fn().mockReturnValue(mockShape),
    } as unknown as jest.Mocked<StackElementBuilder>;
  });

  describe('Invalid context', () => {
    it('should return empty object when context is invalid', () => {
      mockContext.isInvalid = true;
      mockShape.coreConstraints = { minLength: 5 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result).toEqual({});
    });
  });

  describe('Array context', () => {
    it('should set type to array when context is array', () => {
      mockContext.isArray = true;

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('array');
    });
  });

  describe('datatype constraint', () => {
    it('should apply datatype to items when array context', () => {
      mockContext.isArray = true;
      mockShape.coreConstraints = { datatype: 'http://www.w3.org/2001/XMLSchema#string' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('array');
      expect(result.items).toHaveProperty('type', 'string');
    });

    it('should apply datatype directly when not array context', () => {
      mockContext.isArray = false;
      mockShape.coreConstraints = { datatype: 'http://www.w3.org/2001/XMLSchema#integer' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('integer');
    });
  });

  describe('minLength constraint', () => {
    it('should apply minLength and set required flag', () => {
      mockShape.coreConstraints = { minLength: 5 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minLength).toBe(5);
      expect(mockContext.required).toBe(true);
    });
  });

  describe('maxLength constraint', () => {
    it('should apply maxLength', () => {
      mockShape.coreConstraints = { maxLength: 10 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maxLength).toBe(10);
    });
  });

  describe('minInclusive constraint', () => {
    it('should apply minimum for numeric datatype', () => {
      mockShape.coreConstraints = {
        minInclusive: 0,
        datatype: 'http://www.w3.org/2001/XMLSchema#integer',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minimum).toBe(0);
    });

    it('should not apply minimum for non-numeric datatype', () => {
      mockShape.coreConstraints = {
        minInclusive: 0,
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minimum).toBeUndefined();
    });

    it('should apply minimum when no datatype specified', () => {
      mockShape.coreConstraints = { minInclusive: 10 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minimum).toBe(10);
    });
  });

  describe('maxInclusive constraint', () => {
    it('should apply maximum for numeric datatype', () => {
      mockShape.coreConstraints = {
        maxInclusive: 100,
        datatype: 'http://www.w3.org/2001/XMLSchema#integer',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maximum).toBe(100);
    });

    it('should not apply maximum for non-numeric datatype', () => {
      mockShape.coreConstraints = {
        maxInclusive: 100,
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maximum).toBeUndefined();
    });
  });

  describe('minExclusive constraint', () => {
    it('should apply exclusiveMinimum for numeric datatype', () => {
      mockShape.coreConstraints = {
        minExclusive: 0,
        datatype: 'http://www.w3.org/2001/XMLSchema#decimal',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.exclusiveMinimum).toBe(0);
    });

    it('should not apply exclusiveMinimum for non-numeric datatype', () => {
      mockShape.coreConstraints = {
        minExclusive: 0,
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.exclusiveMinimum).toBeUndefined();
    });
  });

  describe('maxExclusive constraint', () => {
    it('should apply exclusiveMaximum for numeric datatype', () => {
      mockShape.coreConstraints = {
        maxExclusive: 100,
        datatype: 'http://www.w3.org/2001/XMLSchema#decimal',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.exclusiveMaximum).toBe(100);
    });

    it('should not apply exclusiveMaximum for non-numeric datatype', () => {
      mockShape.coreConstraints = {
        maxExclusive: 100,
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.exclusiveMaximum).toBeUndefined();
    });
  });

  describe('nodeKind constraint', () => {
    it('should apply nodeKind mapping when not array', () => {
      mockContext.isArray = false;
      mockShape.coreConstraints = { nodeKind: NodeKind.IRI };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should not apply nodeKind when array context', () => {
      mockContext.isArray = true;
      mockShape.coreConstraints = { nodeKind: NodeKind.IRI };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.format).toBeUndefined();
    });
  });

  describe('in constraint', () => {
    it('should apply enum constraint', () => {
      mockShape.coreConstraints = {
        in: ['http://example.com/value1', 'http://example.com/value2', 'http://example.com/value3'],
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.enum).toEqual(['value1', 'value2', 'value3']);
    });
  });

  describe('class constraint', () => {
    it('should apply $ref to items when array context', () => {
      mockContext.isArray = true;
      mockShape.coreConstraints = { class: 'http://example.com/Person' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.items).toHaveProperty('$ref', '#/$defs/Person');
    });

    it('should apply $ref directly when not array context', () => {
      mockContext.isArray = false;
      mockShape.coreConstraints = { class: 'http://example.com/Person' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.$ref).toBe('#/$defs/Person');
    });
  });

  describe('node constraint', () => {
    it('should apply node $ref to items when array context', () => {
      mockContext.isArray = true;
      mockShape.coreConstraints = { node: 'http://example.com/AddressShape' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.items).toHaveProperty('$ref', '#/$defs/Address');
    });

    it('should apply node $ref directly when not array context', () => {
      mockContext.isArray = false;
      mockShape.coreConstraints = { node: 'http://example.com/AddressShape' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.$ref).toBe('#/$defs/Address');
    });
  });

  describe('qualifiedValueShape constraint', () => {
    it('should apply qualifiedValueShape $ref to items when array context', () => {
      mockContext.isArray = true;
      mockShape.coreConstraints = { qualifiedValueShape: 'http://example.com/QualifiedShape' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.items).toHaveProperty('$ref', '#/$defs/Qualified');
    });

    it('should apply qualifiedValueShape $ref directly when not array context', () => {
      mockContext.isArray = false;
      mockShape.coreConstraints = { qualifiedValueShape: 'http://example.com/QualifiedShape' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.$ref).toBe('#/$defs/Qualified');
    });
  });

  describe('minCount constraint', () => {
    it('should apply minItems when setMinItems is true', () => {
      mockContext.setMinItems = true;
      mockShape.coreConstraints = { minCount: 1 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minItems).toBe(1);
    });

    it('should not apply minItems when setMinItems is false', () => {
      mockContext.setMinItems = false;
      mockShape.coreConstraints = { minCount: 1 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minItems).toBeUndefined();
    });
  });

  describe('maxCount constraint', () => {
    it('should apply maxItems when setMaxItems is true', () => {
      mockContext.setMaxItems = true;
      mockShape.coreConstraints = { maxCount: 5 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maxItems).toBe(5);
    });

    it('should not apply maxItems when setMaxItems is false', () => {
      mockContext.setMaxItems = false;
      mockShape.coreConstraints = { maxCount: 5 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maxItems).toBeUndefined();
    });
  });

  describe('qualifiedMinCount constraint', () => {
    it('should apply minItems when setMinItems is true', () => {
      mockContext.setMinItems = true;
      mockShape.coreConstraints = { qualifiedMinCount: 2 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minItems).toBe(2);
    });

    it('should not apply minItems when setMinItems is false', () => {
      mockContext.setMinItems = false;
      mockShape.coreConstraints = { qualifiedMinCount: 2 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.minItems).toBeUndefined();
    });
  });

  describe('qualifiedMaxCount constraint', () => {
    it('should apply maxItems when setMaxItems is true', () => {
      mockContext.setMaxItems = true;
      mockShape.coreConstraints = { qualifiedMaxCount: 10 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maxItems).toBe(10);
    });

    it('should not apply maxItems when setMaxItems is false', () => {
      mockContext.setMaxItems = false;
      mockShape.coreConstraints = { qualifiedMaxCount: 10 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.maxItems).toBeUndefined();
    });
  });

  describe('pattern constraint', () => {
    it('should apply pattern', () => {
      mockShape.coreConstraints = { pattern: '^[A-Z][a-z]+$' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.pattern).toBe('^[A-Z][a-z]+$');
    });
  });

  describe('hasValue constraint', () => {
    it('should apply const with stripped name for string value', () => {
      mockShape.coreConstraints = { hasValue: 'http://example.com/SpecificValue' };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.const).toBe('SpecificValue');
    });

    it('should apply const directly for non-string value', () => {
      mockShape.coreConstraints = { hasValue: 42 };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.const).toBe(42);
    });

    it('should not apply const when null', () => {
      mockShape.coreConstraints = { hasValue: undefined };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.const).toBeUndefined();
    });
  });

  describe('logical constraints', () => {
    let referencedShape: ShapeDefinition;
    let referencedElement: StackElement;

    beforeEach(() => {
      referencedShape = {
        nodeKey: 'http://example.com/ReferencedShape',
        shape: { type: SHAPE_TYPE.NODE_SHAPE },
        coreConstraints: { datatype: 'http://www.w3.org/2001/XMLSchema#string' },
        dependentShapes: [],
        additionalProperties: [],
        targets: [],
      };

      const builder = new JsonSchemaObjectBuilder();
      builder.type('string');

      referencedElement = {
        builder,
        shape: referencedShape,
        context: mockContext,
        dependentsProcessed: false,
        isRoot: false,
        isLogicalFragment: false,
      };

      processedMap.set(referencedShape, referencedElement);
    });

    describe('or constraint', () => {
      it('should apply anyOf with resolved shapes', () => {
        mockShape.coreConstraints = { or: ['ReferencedShape'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.anyOf).toBeDefined();
        expect(result.anyOf).toHaveLength(1);
        expect(result.anyOf?.[0]).toEqual({ type: 'string' });
      });

      it('should not apply anyOf when null', () => {
        mockShape.coreConstraints = { or: undefined };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.anyOf).toBeUndefined();
      });

      it('should not apply anyOf when no shapes are resolved', () => {
        mockShape.coreConstraints = { or: ['NonExistentShape'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.anyOf).toBeUndefined();
      });
    });

    describe('and constraint', () => {
      it('should apply allOf with resolved shapes', () => {
        mockShape.coreConstraints = { and: ['ReferencedShape'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.allOf).toBeDefined();
        expect(result.allOf).toHaveLength(1);
        expect(result.allOf?.[0]).toEqual({ type: 'string' });
      });

      it('should not apply allOf when null', () => {
        mockShape.coreConstraints = { and: undefined };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.allOf).toBeUndefined();
      });
    });

    describe('xone constraint', () => {
      it('should apply oneOf with resolved shapes', () => {
        mockShape.coreConstraints = { xone: ['ReferencedShape'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.oneOf).toBeDefined();
        expect(result.oneOf).toHaveLength(1);
        expect(result.oneOf?.[0]).toEqual({ type: 'string' });
      });

      it('should not apply oneOf when null', () => {
        mockShape.coreConstraints = { xone: undefined };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.oneOf).toBeUndefined();
      });
    });

    describe('not constraint', () => {
      it('should apply not with resolved shape', () => {
        mockShape.coreConstraints = { not: ['ReferencedShape'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.not).toBeDefined();
        expect(result.not).toEqual({ type: 'string' });
      });

      it('should not apply not when null', () => {
        mockShape.coreConstraints = { not: undefined };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.not).toBeUndefined();
      });

      it('should not apply not when no shape is resolved', () => {
        mockShape.coreConstraints = { not: ['NonExistentShape'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.not).toBeUndefined();
      });
    });
  });

  describe('custom property constraints', () => {
    describe('lessThan constraint', () => {
      it('should apply x-shacl-lessThan custom property', () => {
        mockShape.coreConstraints = { lessThan: 'http://example.com/otherProperty' };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-lessThan']).toBe('otherProperty');
      });
    });

    describe('equals constraint', () => {
      it('should apply x-shacl-equals custom property', () => {
        mockShape.coreConstraints = { equals: 'http://example.com/sameProperty' };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-equals']).toBe('sameProperty');
      });
    });

    describe('defaultValue constraint', () => {
      it('should apply default value for string', () => {
        mockShape.coreConstraints = {
          defaultValue: 'test',
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
        };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.default).toBe('test');
      });

      it('should apply default value for integer', () => {
        mockShape.coreConstraints = {
          defaultValue: '42',
          datatype: 'http://www.w3.org/2001/XMLSchema#integer',
        };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.default).toBe(42);
      });

      it('should apply default value for boolean', () => {
        mockShape.coreConstraints = {
          defaultValue: 'true',
          datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
        };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.default).toBe(true);
      });
    });

    describe('lessThanOrEquals constraint', () => {
      it('should apply x-shacl-lessThanOrEquals custom property', () => {
        mockShape.coreConstraints = { lessThanOrEquals: 'http://example.com/maxProperty' };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-lessThanOrEquals']).toBe('maxProperty');
      });
    });

    describe('disjoint constraint', () => {
      it('should apply x-shacl-disjoint as single value for one item', () => {
        mockShape.coreConstraints = { disjoint: ['http://example.com/prop1'] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-disjoint']).toBe('prop1');
      });

      it('should apply x-shacl-disjoint as array for multiple items', () => {
        mockShape.coreConstraints = {
          disjoint: ['http://example.com/prop1', 'http://example.com/prop2'],
        };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-disjoint']).toEqual(['prop1', 'prop2']);
      });

      it('should not apply disjoint when empty array', () => {
        mockShape.coreConstraints = { disjoint: [] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-disjoint']).toBeUndefined();
      });
    });

    describe('ignoredProperties constraint', () => {
      it('should apply x-shacl-ignoredProperties', () => {
        mockShape.coreConstraints = {
          ignoredProperties: ['http://example.com/ignored1', 'http://example.com/ignored2'],
        };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-ignoredProperties']).toEqual([
          'http://example.com/ignored1',
          'http://example.com/ignored2',
        ]);
      });

      it('should not apply ignoredProperties when empty array', () => {
        mockShape.coreConstraints = { ignoredProperties: [] };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-ignoredProperties']).toBeUndefined();
      });
    });

    describe('closed constraint', () => {
      it('should apply additionalProperties false when closed is true', () => {
        mockShape.coreConstraints = { closed: true };

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result.additionalProperties).toBe(false);
      });
    });

    describe('unmapped constraints', () => {
      it('should apply custom x-shacl property for unmapped constraint', () => {
        mockShape.coreConstraints = { uniqueLang: true } as CoreConstraints;

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-uniqueLang']).toBe(true);
      });

      it('should not apply custom property for "property" key', () => {
        mockShape.coreConstraints = { property: ['someProperty'] } as CoreConstraints;

        const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
        const result = converter.convert();

        expect(result['x-shacl-property']).toBeUndefined();
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple constraints together', () => {
      mockShape.coreConstraints = {
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
        minLength: 3,
        maxLength: 50,
        pattern: '^[A-Za-z]+$',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('string');
      expect(result.minLength).toBe(3);
      expect(result.maxLength).toBe(50);
      expect(result.pattern).toBe('^[A-Za-z]+$');
      expect(mockContext.required).toBe(true);
    });

    it('should handle array with datatype and count constraints', () => {
      mockContext.isArray = true;
      mockContext.setMinItems = true;
      mockContext.setMaxItems = true;
      mockShape.coreConstraints = {
        datatype: 'http://www.w3.org/2001/XMLSchema#integer',
        minCount: 1,
        maxCount: 10,
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('array');
      expect(result.items).toHaveProperty('type', 'integer');
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(10);
    });

    it('should handle class reference with existing items', () => {
      mockContext.isArray = true;
      mockShape.coreConstraints = {
        datatype: 'http://www.w3.org/2001/XMLSchema#string',
        class: 'http://example.com/Person',
      };

      const converter = new ConstraintConverter(mockStackElementBuilder, processedMap);
      const result = converter.convert();

      expect(result.type).toBe('array');
      expect(result.items).toHaveProperty('$ref', '#/$defs/Person');
      expect(result.items).toHaveProperty('type', 'string');
    });
  });
});
