import { describe, expect, it } from '@jest/globals';
import { mergePropertySchemas } from './property-schema-merger';
import { JsonSchemaObjectType, JsonSchemaType } from './json-schema-type';

describe('PropertySchemaMerger', () => {
  describe('Empty schema handling', () => {
    it('should return source when existing is empty and source is not empty', () => {
      const existing: JsonSchemaObjectType = {};
      const source: JsonSchemaObjectType = { type: 'string', minLength: 1 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual(source);
    });

    it('should return existing when source is empty and existing is not empty', () => {
      const existing: JsonSchemaObjectType = { type: 'string', minLength: 1 };
      const source: JsonSchemaObjectType = {};

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual(existing);
    });

    it('should return existing when both are empty', () => {
      const existing: JsonSchemaObjectType = {};
      const source: JsonSchemaObjectType = {};

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual(existing);
    });

    it('should filter empty schemas from source allOf when existing is empty', () => {
      const existing: JsonSchemaObjectType = {};
      const source: JsonSchemaObjectType = {
        allOf: [{}, { type: 'string', maxLength: 50 }, {}],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      // Empty existing + source with allOf containing empty schemas
      expect(result.allOf).toHaveLength(1);
      expect(result.allOf).toEqual([{ type: 'string', maxLength: 50 }]);
    });
  });

  describe('Neither has allOf', () => {
    it('should create allOf with both schemas', () => {
      const existing: JsonSchemaObjectType = { type: 'string', minLength: 1 };
      const source: JsonSchemaObjectType = { type: 'string', maxLength: 10 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [
          { type: 'string', minLength: 1 },
          { type: 'string', maxLength: 10 },
        ],
      });
    });

    it('should handle boolean schemas', () => {
      const existing: JsonSchemaType = true;
      const source: JsonSchemaObjectType = { type: 'string' };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [true, { type: 'string' }],
      });
    });

    it('should create allOf with different constraint types', () => {
      const existing: JsonSchemaObjectType = { type: 'integer', minimum: 0 };
      const source: JsonSchemaObjectType = { type: 'integer', maximum: 100 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [
          { type: 'integer', minimum: 0 },
          { type: 'integer', maximum: 100 },
        ],
      });
    });
  });

  describe('Both have allOf', () => {
    it('should flatten and merge both allOf arrays', () => {
      const existing: JsonSchemaObjectType = {
        allOf: [{ type: 'string', minLength: 1 }, { pattern: '^[A-Z]' }],
      };
      const source: JsonSchemaObjectType = {
        allOf: [{ type: 'string', maxLength: 50 }, { pattern: '[a-z]$' }],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      expect(result.allOf).toHaveLength(4);
      expect(result.allOf).toEqual([
        { type: 'string', minLength: 1 },
        { pattern: '^[A-Z]' },
        { type: 'string', maxLength: 50 },
        { pattern: '[a-z]$' },
      ]);
    });

    it('should filter out empty schemas from source when merging allOf arrays', () => {
      const existing: JsonSchemaObjectType = {
        allOf: [{ type: 'string', minLength: 1 }, {}],
      };
      const source: JsonSchemaObjectType = {
        allOf: [{}, { type: 'string', maxLength: 50 }, {}],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      // Empty schemas filtered from source allOf, but existing's empty schema remains
      expect(result.allOf).toHaveLength(3);
      expect(result.allOf).toEqual([
        { type: 'string', minLength: 1 },
        {},
        { type: 'string', maxLength: 50 },
      ]);
    });

    it('should mutate existing allOf array', () => {
      const existing: JsonSchemaObjectType = {
        allOf: [{ type: 'string' }],
      };
      const source: JsonSchemaObjectType = {
        allOf: [{ minLength: 1 }],
      };

      const result = mergePropertySchemas(existing, source);

      expect(result).toBe(existing);
      expect(existing.allOf).toHaveLength(2);
    });
  });

  describe('Only existing has allOf', () => {
    it('should append source to existing allOf', () => {
      const existing: JsonSchemaObjectType = {
        allOf: [{ type: 'string', minLength: 1 }, { pattern: '^[A-Z]' }],
      };
      const source: JsonSchemaObjectType = { maxLength: 50 };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      expect(result.allOf).toHaveLength(3);
      expect(result.allOf).toEqual([
        { type: 'string', minLength: 1 },
        { pattern: '^[A-Z]' },
        { maxLength: 50 },
      ]);
    });

    it('should not append empty source schema', () => {
      const existing: JsonSchemaObjectType = {
        allOf: [{ type: 'string', minLength: 1 }],
      };
      const source: JsonSchemaObjectType = {};

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      expect(result.allOf).toHaveLength(1);
      expect(result.allOf).toEqual([{ type: 'string', minLength: 1 }]);
    });

    it('should mutate existing allOf array', () => {
      const existing: JsonSchemaObjectType = {
        allOf: [{ type: 'string' }],
      };
      const source: JsonSchemaObjectType = { minLength: 1 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toBe(existing);
      expect(existing.allOf).toHaveLength(2);
    });
  });

  describe('Only source has allOf', () => {
    it('should prepend existing to source allOf', () => {
      const existing: JsonSchemaObjectType = { type: 'string', minLength: 1 };
      const source: JsonSchemaObjectType = {
        allOf: [{ maxLength: 50 }, { pattern: '^[A-Z]' }],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      expect(result.allOf).toHaveLength(3);
      expect(result.allOf).toEqual([
        { type: 'string', minLength: 1 },
        { maxLength: 50 },
        { pattern: '^[A-Z]' },
      ]);
    });

    it('should filter out empty schemas from source allOf when only source has allOf', () => {
      const existing: JsonSchemaObjectType = { type: 'string', minLength: 1 };
      const source: JsonSchemaObjectType = {
        allOf: [{}, { maxLength: 50 }, {}],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      // Empty schemas from source allOf should be filtered out
      expect(result.allOf).toHaveLength(2);
      expect(result.allOf).toEqual([{ type: 'string', minLength: 1 }, { maxLength: 50 }]);
    });

    it('should return filtered allOf when existing is empty and source has allOf with empty schemas', () => {
      const existing: JsonSchemaObjectType = {};
      const source: JsonSchemaObjectType = {
        allOf: [{}, { type: 'string', maxLength: 50 }, {}],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      expect(result.allOf).toHaveLength(1);
      expect(result.allOf).toEqual([{ type: 'string', maxLength: 50 }]);
    });

    it('should handle source allOf with only non-empty schemas', () => {
      const existing: JsonSchemaObjectType = { type: 'string' };
      const source: JsonSchemaObjectType = {
        allOf: [{ maxLength: 50 }],
      };

      const result = mergePropertySchemas(existing, source) as JsonSchemaObjectType;

      expect(result.allOf).toHaveLength(2);
      expect(result.allOf).toEqual([{ type: 'string' }, { maxLength: 50 }]);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle merging with pattern and minLength constraints', () => {
      const existing: JsonSchemaObjectType = { type: 'string', pattern: '^[A-Z]' };
      const source: JsonSchemaObjectType = { type: 'string', minLength: 1 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [
          { type: 'string', pattern: '^[A-Z]' },
          { type: 'string', minLength: 1 },
        ],
      });
    });

    it('should handle merging array schemas', () => {
      const existing: JsonSchemaObjectType = {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      };
      const source: JsonSchemaObjectType = { type: 'array', maxItems: 10 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [
          { type: 'array', items: { type: 'string' }, minItems: 1 },
          { type: 'array', maxItems: 10 },
        ],
      });
    });

    it('should handle merging with enum constraints', () => {
      const existing: JsonSchemaObjectType = { enum: ['active', 'inactive'] };
      const source: JsonSchemaObjectType = { type: 'string', minLength: 3 };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [{ enum: ['active', 'inactive'] }, { type: 'string', minLength: 3 }],
      });
    });

    it('should handle chaining multiple merges', () => {
      const schema1: JsonSchemaObjectType = { type: 'string', minLength: 1 };
      const schema2: JsonSchemaObjectType = { maxLength: 50 };
      const schema3: JsonSchemaObjectType = { pattern: '^[A-Z]' };

      const result1 = mergePropertySchemas(schema1, schema2) as JsonSchemaObjectType;
      const result2 = mergePropertySchemas(result1, schema3) as JsonSchemaObjectType;

      expect(result2.allOf).toHaveLength(3);
      expect(result2.allOf).toEqual([
        { type: 'string', minLength: 1 },
        { maxLength: 50 },
        { pattern: '^[A-Z]' },
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle merging with custom properties', () => {
      const existing: JsonSchemaObjectType = {
        type: 'string',
        'x-custom': 'value1',
      };
      const source: JsonSchemaObjectType = {
        type: 'string',
        'x-another': 'value2',
      };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [
          { type: 'string', 'x-custom': 'value1' },
          { type: 'string', 'x-another': 'value2' },
        ],
      });
    });

    it('should handle merging schemas with $ref', () => {
      const existing: JsonSchemaObjectType = { $ref: '#/$defs/Address' };
      const source: JsonSchemaObjectType = { type: 'object' };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [{ $ref: '#/$defs/Address' }, { type: 'object' }],
      });
    });

    it('should handle boolean false schema', () => {
      const existing: JsonSchemaType = false;
      const source: JsonSchemaObjectType = { type: 'string' };

      const result = mergePropertySchemas(existing, source);

      expect(result).toEqual({
        allOf: [false, { type: 'string' }],
      });
    });
  });
});
