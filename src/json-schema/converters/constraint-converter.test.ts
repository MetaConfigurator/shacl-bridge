import { ConstraintConverter } from './constraint-converter';
import { CoreConstraints } from '../../ir/meta-model/core-constraints';
import { NodeKind } from '../../ir/meta-model/node-kind';

describe('ConstraintConverter', () => {
  let converter: ConstraintConverter;

  beforeEach(() => {
    converter = new ConstraintConverter();
  });

  describe('string constraints', () => {
    it('should convert minLength constraint', () => {
      const constraints: CoreConstraints = { minLength: 5 };
      const result = converter.convert(constraints);
      expect(result.minLength).toBe(5);
    });

    it('should convert maxLength constraint', () => {
      const constraints: CoreConstraints = { maxLength: 100 };
      const result = converter.convert(constraints);
      expect(result.maxLength).toBe(100);
    });

    it('should convert pattern constraint', () => {
      const constraints: CoreConstraints = { pattern: '^[a-z]+$' };
      const result = converter.convert(constraints);
      expect(result.pattern).toBe('^[a-z]+$');
    });

    it('should convert multiple string constraints', () => {
      const constraints: CoreConstraints = {
        minLength: 1,
        maxLength: 50,
        pattern: '^\\w+$',
      };
      const result = converter.convert(constraints);
      expect(result.minLength).toBe(1);
      expect(result.maxLength).toBe(50);
      expect(result.pattern).toBe('^\\w+$');
    });
  });

  describe('numeric constraints', () => {
    it('should convert minInclusive to minimum', () => {
      const constraints: CoreConstraints = { minInclusive: 0 };
      const result = converter.convert(constraints);
      expect(result.minimum).toBe(0);
    });

    it('should convert maxInclusive to maximum', () => {
      const constraints: CoreConstraints = { maxInclusive: 100 };
      const result = converter.convert(constraints);
      expect(result.maximum).toBe(100);
    });

    it('should convert minExclusive to exclusiveMinimum', () => {
      const constraints: CoreConstraints = { minExclusive: 0 };
      const result = converter.convert(constraints);
      expect(result.exclusiveMinimum).toBe(0);
    });

    it('should convert maxExclusive to exclusiveMaximum', () => {
      const constraints: CoreConstraints = { maxExclusive: 100 };
      const result = converter.convert(constraints);
      expect(result.exclusiveMaximum).toBe(100);
    });

    it('should convert multiple numeric constraints', () => {
      const constraints: CoreConstraints = {
        minInclusive: 1,
        maxExclusive: 100,
      };
      const result = converter.convert(constraints);
      expect(result.minimum).toBe(1);
      expect(result.exclusiveMaximum).toBe(100);
    });
  });

  describe('nodeKind constraints', () => {
    it('should convert sh:IRI to string with uri format', () => {
      const constraints: CoreConstraints = { nodeKind: NodeKind.IRI };
      const result = converter.convert(constraints);
      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert sh:Literal to type without format', () => {
      const constraints: CoreConstraints = { nodeKind: NodeKind.LITERAL };
      const result = converter.convert(constraints);
      // Literal can be string, number, or boolean - we default to no specific type
      expect(result['x-shacl-nodeKind']).toBe('sh:Literal');
    });

    it('should convert sh:BlankNode to extension', () => {
      const constraints: CoreConstraints = { nodeKind: NodeKind.BLANK_NODE };
      const result = converter.convert(constraints);
      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNode');
    });

    it('should convert sh:BlankNodeOrIRI to extension', () => {
      const constraints: CoreConstraints = { nodeKind: NodeKind.BLANK_NODE_OR_IRI };
      const result = converter.convert(constraints);
      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNodeOrIRI');
    });

    it('should convert sh:IRIOrLiteral to extension', () => {
      const constraints: CoreConstraints = { nodeKind: NodeKind.IRI_OR_LITERAL };
      const result = converter.convert(constraints);
      expect(result['x-shacl-nodeKind']).toBe('sh:IRIOrLiteral');
    });

    it('should convert sh:BlankNodeOrLiteral to extension', () => {
      const constraints: CoreConstraints = { nodeKind: NodeKind.BLANK_NODE_OR_LITERAL };
      const result = converter.convert(constraints);
      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNodeOrLiteral');
    });
  });

  describe('in constraint (enum)', () => {
    it('should convert sh:in to enum', () => {
      const constraints: CoreConstraints = { in: ['value1', 'value2', 'value3'] };
      const result = converter.convert(constraints);
      expect(result.enum).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle empty in array', () => {
      const constraints: CoreConstraints = { in: [] };
      const result = converter.convert(constraints);
      expect(result.enum).toBeUndefined();
    });
  });

  describe('empty constraints', () => {
    it('should return empty object for empty constraints', () => {
      const constraints: CoreConstraints = {};
      const result = converter.convert(constraints);
      expect(result).toEqual({});
    });

    it('should return empty object for undefined constraints', () => {
      const result = converter.convert(undefined as unknown as CoreConstraints);
      expect(result).toEqual({});
    });
  });

  describe('combined constraints', () => {
    it('should convert multiple constraint types together', () => {
      const constraints: CoreConstraints = {
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-zA-Z]',
        minInclusive: 0,
      };
      const result = converter.convert(constraints);
      expect(result.minLength).toBe(1);
      expect(result.maxLength).toBe(255);
      expect(result.pattern).toBe('^[a-zA-Z]');
      expect(result.minimum).toBe(0);
    });
  });
});
