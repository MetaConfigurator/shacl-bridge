import { ConstraintConverter } from './constraint-converter';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { NodeKind } from '../../../ir/meta-model/node-kind';

describe('ConstraintConverter', () => {
  describe('String Constraints', () => {
    it('should convert minLength constraint', () => {
      const constraints: CoreConstraints = {
        minLength: 10,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(10);
    });

    it('should convert maxLength constraint', () => {
      const constraints: CoreConstraints = {
        maxLength: 100,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.maxLength).toBe(100);
    });

    it('should convert pattern constraint', () => {
      const constraints: CoreConstraints = {
        pattern: '^[A-Z]+$',
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.pattern).toBe('^[A-Z]+$');
    });

    it('should convert multiple string constraints together', () => {
      const constraints: CoreConstraints = {
        minLength: 5,
        maxLength: 50,
        pattern: '^[a-z]+$',
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(50);
      expect(result.pattern).toBe('^[a-z]+$');
    });
  });

  describe('Numeric Constraints', () => {
    it('should convert minInclusive to minimum', () => {
      const constraints: CoreConstraints = {
        minInclusive: 0,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minimum).toBe(0);
    });

    it('should convert maxInclusive to maximum', () => {
      const constraints: CoreConstraints = {
        maxInclusive: 100,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.maximum).toBe(100);
    });

    it('should convert minExclusive to exclusiveMinimum', () => {
      const constraints: CoreConstraints = {
        minExclusive: 0,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.exclusiveMinimum).toBe(0);
    });

    it('should convert maxExclusive to exclusiveMaximum', () => {
      const constraints: CoreConstraints = {
        maxExclusive: 1000,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.exclusiveMaximum).toBe(1000);
    });

    it('should convert multiple numeric constraints together', () => {
      const constraints: CoreConstraints = {
        minInclusive: 10,
        maxInclusive: 100,
        minExclusive: 5,
        maxExclusive: 110,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minimum).toBe(10);
      expect(result.maximum).toBe(100);
      expect(result.exclusiveMinimum).toBe(5);
      expect(result.exclusiveMaximum).toBe(110);
    });

    it('should handle negative numbers', () => {
      const constraints: CoreConstraints = {
        minInclusive: -100,
        maxInclusive: -10,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minimum).toBe(-100);
      expect(result.maximum).toBe(-10);
    });

    it('should handle decimal numbers', () => {
      const constraints: CoreConstraints = {
        minInclusive: 0.5,
        maxInclusive: 99.99,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minimum).toBe(0.5);
      expect(result.maximum).toBe(99.99);
    });
  });

  describe('NodeKind Constraint', () => {
    it('should convert NodeKind.IRI to type string with format uri', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert NodeKind.LITERAL to extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.LITERAL,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result['x-shacl-nodeKind']).toBe('sh:Literal');
    });

    it('should convert NodeKind.BLANK_NODE to extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.BLANK_NODE,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNode');
    });

    it('should convert all NodeKind enum values', () => {
      const testCases: {
        nodeKind: NodeKind;
        expectedType?: string;
        expectedFormat?: string;
        expectedExtension?: string;
      }[] = [
        { nodeKind: NodeKind.IRI, expectedType: 'string', expectedFormat: 'uri' },
        { nodeKind: NodeKind.LITERAL, expectedExtension: 'sh:Literal' },
        { nodeKind: NodeKind.BLANK_NODE, expectedExtension: 'sh:BlankNode' },
        { nodeKind: NodeKind.BLANK_NODE_OR_IRI, expectedExtension: 'sh:BlankNodeOrIRI' },
        { nodeKind: NodeKind.IRI_OR_LITERAL, expectedExtension: 'sh:IRIOrLiteral' },
        { nodeKind: NodeKind.BLANK_NODE_OR_LITERAL, expectedExtension: 'sh:BlankNodeOrLiteral' },
      ];

      testCases.forEach(({ nodeKind, expectedType, expectedFormat, expectedExtension }) => {
        const constraints: CoreConstraints = { nodeKind };

        const result = new ConstraintConverter().convert(constraints);

        if (expectedType) {
          expect(result.type).toBe(expectedType);
        }
        if (expectedFormat) {
          expect(result.format).toBe(expectedFormat);
        }
        if (expectedExtension) {
          expect(result['x-shacl-nodeKind']).toBe(expectedExtension);
        }
      });
    });
  });

  describe('Enum Constraint', () => {
    it('should convert sh:in to enum', () => {
      const constraints: CoreConstraints = {
        in: ['red', 'green', 'blue'],
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.enum).toEqual(['red', 'green', 'blue']);
    });

    it('should handle empty enum array', () => {
      const constraints: CoreConstraints = {
        in: [],
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.enum).toBeUndefined();
    });

    it('should handle single value enum', () => {
      const constraints: CoreConstraints = {
        in: ['single'],
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.enum).toEqual(['single']);
    });
  });

  describe('Empty Constraints', () => {
    it('should return empty result for empty constraints', () => {
      const constraints: CoreConstraints = {};

      const result = new ConstraintConverter().convert(constraints);

      expect(result).toEqual({});
    });

    it('should handle undefined constraint values', () => {
      const constraints: CoreConstraints = {
        minLength: undefined,
        maxLength: undefined,
        pattern: undefined,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBeUndefined();
      expect(result.maxLength).toBeUndefined();
      expect(result.pattern).toBeUndefined();
    });
  });

  describe('Mixed Constraints', () => {
    it('should convert all constraint types together', () => {
      const constraints: CoreConstraints = {
        minLength: 5,
        maxLength: 100,
        pattern: '^[a-zA-Z]+$',
        minInclusive: 0,
        maxInclusive: 1000,
        nodeKind: NodeKind.IRI,
        in: ['option1', 'option2'],
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
      expect(result.pattern).toBe('^[a-zA-Z]+$');
      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(1000);
      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
      expect(result.enum).toEqual(['option1', 'option2']);
    });

    it('should handle partial constraint sets', () => {
      const constraints: CoreConstraints = {
        minLength: 10,
        maxInclusive: 100,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(10);
      expect(result.maximum).toBe(100);
      expect(result.maxLength).toBeUndefined();
      expect(result.minimum).toBeUndefined();
    });
  });

  describe('Default Strategy Population', () => {
    it('should populate all default strategies on construction', () => {
      const constraints: CoreConstraints = {
        minLength: 5,
        maxLength: 10,
        pattern: '^test$',
        minInclusive: 0,
        maxInclusive: 100,
        minExclusive: -1,
        maxExclusive: 101,
        nodeKind: NodeKind.IRI,
        in: ['a', 'b'],
      };

      const result = new ConstraintConverter().convert(constraints);

      // All registered strategies should work
      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(10);
      expect(result.pattern).toBe('^test$');
      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(100);
      expect(result.exclusiveMinimum).toBe(-1);
      expect(result.exclusiveMaximum).toBe(101);
      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
      expect(result.enum).toEqual(['a', 'b']);
    });
  });

  describe('Unmapped Constraints', () => {
    it('should handle constraints without registered strategies', () => {
      const constraints: CoreConstraints = {
        class: 'http://example.org/Person',
        property: ['http://example.org/name'],
      };

      // Should not throw error, NoStrategy handles unmapped constraints
      expect(() => new ConstraintConverter().convert(constraints)).not.toThrow();
    });

    it('should still process mapped constraints when unmapped ones exist', () => {
      const constraints: CoreConstraints = {
        minLength: 5,
        class: 'http://example.org/Person', // Unmapped
        maxLength: 100,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
    });
  });

  describe('Constraint Precedence', () => {
    it('should process constraints in iteration order', () => {
      const constraints: CoreConstraints = {
        minLength: 5,
        maxLength: 100,
        pattern: '^test$',
      };

      const result = new ConstraintConverter().convert(constraints);

      // All constraints should be present
      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
      expect(result.pattern).toBe('^test$');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const constraints: CoreConstraints = {
        minLength: 0,
        minInclusive: 0,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(0);
      expect(result.minimum).toBe(0);
    });

    it('should handle very large numbers', () => {
      const constraints: CoreConstraints = {
        maxInclusive: Number.MAX_SAFE_INTEGER,
        minInclusive: Number.MIN_SAFE_INTEGER,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.maximum).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.minimum).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should handle complex regex patterns', () => {
      const constraints: CoreConstraints = {
        pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$',
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.pattern).toBe('^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$');
    });
  });

  describe('Result Accumulation', () => {
    it('should accumulate all constraint conversions in single result', () => {
      const constraints: CoreConstraints = {
        minLength: 1,
        maxLength: 10,
        pattern: '^[a-z]+$',
        minInclusive: 0,
        maxInclusive: 100,
      };

      const result = new ConstraintConverter().convert(constraints);

      const expectedKeys = ['minLength', 'maxLength', 'pattern', 'minimum', 'maximum'];
      expectedKeys.forEach((key) => {
        expect(result).toHaveProperty(key);
      });
    });

    it('should not have side effects on subsequent conversions', () => {
      const constraints1: CoreConstraints = { minLength: 5 };
      const constraints2: CoreConstraints = { maxLength: 100 };

      const result1 = new ConstraintConverter().convert(constraints1);
      const result2 = new ConstraintConverter().convert(constraints2);

      expect(result1.minLength).toBe(5);
      expect(result1.maxLength).toBeUndefined();
      expect(result2.maxLength).toBe(100);
      expect(result2.minLength).toBeUndefined();
    });
  });

  describe('Constructor Behavior', () => {
    it('should accept constraints in constructor', () => {
      const constraints: CoreConstraints = { minLength: 5 };

      expect(() => new ConstraintConverter().convert(constraints)).not.toThrow();
    });

    it('should accept empty constraints in constructor', () => {
      expect(() => new ConstraintConverter().convert({})).not.toThrow();
    });

    it('should initialize registry on construction', () => {
      const constraints: CoreConstraints = { minLength: 5 };

      const result = new ConstraintConverter().convert(constraints);

      // Registry should be populated with default strategies
      expect(result.minLength).toBe(5);
    });
  });

  describe('Idempotency', () => {
    it('should produce same result when convert() called multiple times', () => {
      const constraints: CoreConstraints = {
        minLength: 5,
        maxLength: 100,
        pattern: '^test$',
      };

      const result1 = new ConstraintConverter().convert(constraints);
      const result2 = new ConstraintConverter().convert(constraints);
      const result3 = new ConstraintConverter().convert(constraints);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('should handle typical string validation constraints', () => {
      const constraints: CoreConstraints = {
        minLength: 8,
        maxLength: 128,
        pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]+$',
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minLength).toBe(8);
      expect(result.maxLength).toBe(128);
      expect(result.pattern).toBe('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]+$');
    });

    it('should handle typical numeric range constraints', () => {
      const constraints: CoreConstraints = {
        minInclusive: 0,
        maxInclusive: 100,
        minExclusive: -0.1,
        maxExclusive: 100.1,
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(100);
      expect(result.exclusiveMinimum).toBe(-0.1);
      expect(result.exclusiveMaximum).toBe(100.1);
    });

    it('should handle combination of type and value constraints', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
        pattern: '^https?://.+',
        in: ['http://example.org', 'https://example.com'],
      };

      const result = new ConstraintConverter().convert(constraints);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
      expect(result.pattern).toBe('^https?://.+');
      expect(result.enum).toEqual(['http://example.org', 'https://example.com']);
    });
  });
});
