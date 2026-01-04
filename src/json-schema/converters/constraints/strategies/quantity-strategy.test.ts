import { QuantityStrategy } from './quantity-strategy';
import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { JsonSchemaObjectType } from '../../../json-schema-type';

describe('QuantityStrategy', () => {
  describe('basic quantity mapping', () => {
    it('should map minCount to minItems', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems');
      const constraints: CoreConstraints = {
        minCount: 2,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBe(2);
    });

    it('should map maxCount to maxItems', () => {
      const strategy = new QuantityStrategy('maxCount', 'maxItems');
      const constraints: CoreConstraints = {
        maxCount: 10,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.maxItems).toBe(10);
    });

    it('should handle zero values', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems');
      const constraints: CoreConstraints = {
        minCount: 0,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBe(0);
    });

    it('should handle large values', () => {
      const strategy = new QuantityStrategy('maxCount', 'maxItems');
      const constraints: CoreConstraints = {
        maxCount: 1000000,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.maxItems).toBe(1000000);
    });
  });

  describe('conditional application', () => {
    it('should apply constraint when condition is true', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems', (val) => val > 0);
      const constraints: CoreConstraints = {
        minCount: 5,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBe(5);
    });

    it('should not apply constraint when condition is false', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems', (val) => val > 0);
      const constraints: CoreConstraints = {
        minCount: 0,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBeUndefined();
    });

    it('should apply constraint when no condition is provided', () => {
      const strategy = new QuantityStrategy('maxCount', 'maxItems');
      const constraints: CoreConstraints = {
        maxCount: 0,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.maxItems).toBe(0);
    });

    it('should handle condition with equal comparison', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems', (val) => val >= 1);
      const constraints: CoreConstraints = {
        minCount: 1,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBe(1);
    });

    it('should handle condition with range check', () => {
      const strategy = new QuantityStrategy(
        'maxCount',
        'maxItems',
        (val) => val >= 1 && val <= 100
      );
      const constraints: CoreConstraints = {
        maxCount: 50,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.maxItems).toBe(50);
    });

    it('should not apply when condition range check fails', () => {
      const strategy = new QuantityStrategy(
        'maxCount',
        'maxItems',
        (val) => val >= 1 && val <= 100
      );
      const constraints: CoreConstraints = {
        maxCount: 200,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.maxItems).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined constraint value', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems');
      const constraints: CoreConstraints = {};
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBeUndefined();
    });

    it('should overwrite existing schema value', () => {
      const strategy = new QuantityStrategy('maxCount', 'maxItems');
      const constraints: CoreConstraints = {
        maxCount: 20,
      };
      const schema: JsonSchemaObjectType = {
        maxItems: 10,
      };

      strategy.handle(constraints, schema);

      expect(schema.maxItems).toBe(20);
    });

    it('should preserve other schema properties', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems');
      const constraints: CoreConstraints = {
        minCount: 3,
      };
      const schema: JsonSchemaObjectType = {
        type: 'array',
        items: { type: 'string' },
        maxItems: 10,
      };

      strategy.handle(constraints, schema);

      expect(schema.minItems).toBe(3);
      expect(schema.type).toBe('array');
      expect(schema.items).toEqual({ type: 'string' });
      expect(schema.maxItems).toBe(10);
    });

    it('should handle condition with null constraint value gracefully', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems', (val) => val > 0);
      const constraints: CoreConstraints = {};
      const schema: JsonSchemaObjectType = {};

      expect(() => {
        strategy.handle(constraints, schema);
      }).not.toThrow();
      expect(schema.minItems).toBeUndefined();
    });
  });

  describe('type safety', () => {
    it('should maintain type relationship between constraint and schema keys', () => {
      const strategy = new QuantityStrategy('minCount', 'minItems');
      const constraints: CoreConstraints = {
        minCount: 5,
      };
      const schema: JsonSchemaObjectType = {};

      strategy.handle(constraints, schema);

      // Type assertion to verify type safety
      const value: number | undefined = schema.minItems;
      expect(value).toBe(5);
    });
  });
});
