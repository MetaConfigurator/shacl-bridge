import { DefaultStrategy } from './default-strategy';
import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintResult } from '../constraint-converter';

describe('DefaultStrategy', () => {
  describe('String Constraints', () => {
    it('should map minLength constraint to JSON Schema minLength', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: 5 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minLength).toBe(5);
    });

    it('should map maxLength constraint to JSON Schema maxLength', () => {
      const strategy = new DefaultStrategy('maxLength', 'maxLength');
      const constraints: CoreConstraints = { maxLength: 100 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.maxLength).toBe(100);
    });

    it('should map pattern constraint to JSON Schema pattern', () => {
      const strategy = new DefaultStrategy('pattern', 'pattern');
      const constraints: CoreConstraints = { pattern: '^[A-Z]+$' };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.pattern).toBe('^[A-Z]+$');
    });

    it('should handle minLength with value 0', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: 0 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minLength).toBe(0);
    });
  });

  describe('Numeric Constraints', () => {
    it('should map minInclusive constraint to JSON Schema minimum', () => {
      const strategy = new DefaultStrategy('minInclusive', 'minimum');
      const constraints: CoreConstraints = { minInclusive: 10 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minimum).toBe(10);
    });

    it('should map maxInclusive constraint to JSON Schema maximum', () => {
      const strategy = new DefaultStrategy('maxInclusive', 'maximum');
      const constraints: CoreConstraints = { maxInclusive: 100 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.maximum).toBe(100);
    });

    it('should map minExclusive constraint to JSON Schema exclusiveMinimum', () => {
      const strategy = new DefaultStrategy('minExclusive', 'exclusiveMinimum');
      const constraints: CoreConstraints = { minExclusive: 0 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.exclusiveMinimum).toBe(0);
    });

    it('should map maxExclusive constraint to JSON Schema exclusiveMaximum', () => {
      const strategy = new DefaultStrategy('maxExclusive', 'exclusiveMaximum');
      const constraints: CoreConstraints = { maxExclusive: 1000 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.exclusiveMaximum).toBe(1000);
    });

    it('should handle negative numbers for minInclusive', () => {
      const strategy = new DefaultStrategy('minInclusive', 'minimum');
      const constraints: CoreConstraints = { minInclusive: -100 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minimum).toBe(-100);
    });

    it('should handle decimal numbers for maxInclusive', () => {
      const strategy = new DefaultStrategy('maxInclusive', 'maximum');
      const constraints: CoreConstraints = { maxInclusive: 99.99 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.maximum).toBe(99.99);
    });
  });

  describe('Edge Cases', () => {
    it('should not modify result when constraint value is undefined', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: undefined };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minLength).toBeUndefined();
    });

    it('should not modify result when constraint value is null', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: null as unknown as number };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minLength).toBeUndefined();
    });

    it('should not overwrite existing result properties when constraint is undefined', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: undefined };
      const result: ConstraintResult = { minLength: 10 };
      strategy.handle(constraints, result);

      expect(result.minLength).toBe(10);
    });

    it('should overwrite existing result properties when constraint has a value', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: 20 };
      const result: ConstraintResult = { minLength: 10 };
      strategy.handle(constraints, result);

      expect(result.minLength).toBe(20);
    });
  });

  describe('Multiple Constraints', () => {
    it('should only handle the specified constraint and ignore others', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = {
        minLength: 5,
        maxLength: 100,
        pattern: '^test$',
      };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBeUndefined();
      expect(result.pattern).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should preserve the value type when mapping', () => {
      const strategy = new DefaultStrategy('minLength', 'minLength');
      const constraints: CoreConstraints = { minLength: 42 };
      const result: ConstraintResult = {};
      strategy.handle(constraints, result);

      expect(typeof result.minLength).toBe('number');
      expect(result.minLength).toBe(42);
    });
  });
});
