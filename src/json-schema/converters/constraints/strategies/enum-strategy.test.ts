import { EnumStrategy } from './enum-strategy';
import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintResult } from '../constraint-converter';

describe('EnumStrategy', () => {
  describe('Valid Enum Values', () => {
    it('should map sh:in constraint to JSON Schema enum with string values', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: ['red', 'green', 'blue'],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['red', 'green', 'blue']);
    });

    it('should map sh:in constraint to JSON Schema enum with number values', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [1, 2, 3, 4, 5] as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual([1, 2, 3, 4, 5]);
    });

    it('should map sh:in constraint to JSON Schema enum with mixed types', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: ['string', 42, true, null] as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['string', 42, true, null]);
    });

    it('should map sh:in constraint with single value', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: ['single'],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['single']);
    });

    it('should preserve array reference when mapping', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const enumValues = ['a', 'b', 'c'];
      const constraints: CoreConstraints = {
        in: enumValues,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBe(enumValues);
    });
  });

  describe('Empty and Invalid Values', () => {
    it('should not set enum when sh:in is an empty array', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBeUndefined();
    });

    it('should not set enum when sh:in is undefined', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: undefined,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBeUndefined();
    });

    it('should not set enum when sh:in is null', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: null as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBeUndefined();
    });

    it('should not overwrite existing enum when sh:in is empty array', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [],
      };
      const result: ConstraintResult = {
        enum: ['existing'],
      };

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['existing']);
    });

    it('should not overwrite existing enum when sh:in is undefined', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: undefined,
      };
      const result: ConstraintResult = {
        enum: ['existing'],
      };

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['existing']);
    });
  });

  describe('Overwrite Behavior', () => {
    it('should overwrite existing enum when sh:in has valid values', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: ['new', 'values'],
      };
      const result: ConstraintResult = {
        enum: ['old', 'values'],
      };

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['new', 'values']);
    });
  });

  describe('Complex Enum Values', () => {
    it('should handle enum with boolean values', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [true, false] as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual([true, false]);
    });

    it('should handle enum with null values', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [null, 'value', null] as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual([null, 'value', null]);
    });

    it('should handle enum with numeric zero', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [0, 1, 2] as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual([0, 1, 2]);
    });

    it('should handle enum with empty string', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: ['', 'non-empty'],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['', 'non-empty']);
    });

    it('should handle enum with negative numbers', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: [-10, -5, 0, 5, 10] as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual([-10, -5, 0, 5, 10]);
    });
  });

  describe('Multiple Constraints', () => {
    it('should only handle the sh:in constraint and ignore others', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: ['a', 'b'],
        minLength: 5,
        pattern: '^test$',
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toEqual(['a', 'b']);
      expect(result.minLength).toBeUndefined();
      expect(result.pattern).toBeUndefined();
    });
  });

  describe('Array Type Validation', () => {
    it('should not set enum when value is not an array', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: 'not-an-array' as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBeUndefined();
    });

    it('should not set enum when value is an object', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: { key: 'value' } as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBeUndefined();
    });

    it('should not set enum when value is a number', () => {
      const strategy = new EnumStrategy('in', 'enum');
      const constraints: CoreConstraints = {
        in: 42 as unknown as string[],
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.enum).toBeUndefined();
    });
  });
});
