import { SchemaFlattener } from './schema-flattener';
import { JsonSchemaObjectType } from '../json-schema/meta/json-schema-type';

describe('SchemaFlattener', () => {
  describe('simple schemas', () => {
    it('should return schema unchanged if no nested schemas', () => {
      const schema: JsonSchemaObjectType = {
        type: 'string',
        minLength: 1,
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result).toEqual(schema);
    });

    it('should not create $defs for empty schema', () => {
      const schema: JsonSchemaObjectType = {};

      const result = new SchemaFlattener(schema).flatten();

      expect(result).toEqual({});
      expect(result.$defs).toBeUndefined();
    });
  });

  describe('properties', () => {
    it('should flatten nested object in properties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          name: {
            type: 'object',
            properties: {
              first: { type: 'string' },
            },
          },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.properties?.name).toEqual({ $ref: '#/$defs/name' });
      expect(result.$defs?.name).toEqual({
        type: 'object',
        properties: {
          first: { $ref: '#/$defs/name_first' },
        },
      });
      expect(result.$defs?.name_first).toEqual({ type: 'string' });
    });

    it('should flatten primitive schema in properties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          age: { type: 'integer', minimum: 0 },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.properties?.age).toEqual({ $ref: '#/$defs/age' });
      expect(result.$defs?.age).toEqual({ type: 'integer', minimum: 0 });
    });

    it('should handle multiple properties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.name).toEqual({ type: 'string' });
      expect(result.$defs?.age).toEqual({ type: 'integer' });
    });
  });

  describe('items', () => {
    it('should flatten items schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        items: { type: 'string', minLength: 1 },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.items).toEqual({ $ref: '#/$defs/items' });
      expect(result.$defs?.items).toEqual({ type: 'string', minLength: 1 });
    });

    it('should handle boolean items', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        items: false,
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.items).toBe(false);
      expect(result.$defs).toBeUndefined();
    });
  });

  describe('prefixItems', () => {
    it('should flatten each prefixItems schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        prefixItems: [{ type: 'string' }, { type: 'number' }],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.prefixItems).toEqual([
        { $ref: '#/$defs/prefixItems_0' },
        { $ref: '#/$defs/prefixItems_1' },
      ]);
      expect(result.$defs?.prefixItems_0).toEqual({ type: 'string' });
      expect(result.$defs?.prefixItems_1).toEqual({ type: 'number' });
    });
  });

  describe('logical operators', () => {
    it('should flatten allOf schemas', () => {
      const schema: JsonSchemaObjectType = {
        allOf: [{ type: 'object' }, { minProperties: 1 }],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.allOf).toEqual([{ $ref: '#/$defs/allOf_0' }, { $ref: '#/$defs/allOf_1' }]);
      expect(result.$defs?.allOf_0).toEqual({ type: 'object' });
      expect(result.$defs?.allOf_1).toEqual({ minProperties: 1 });
    });

    it('should flatten anyOf schemas', () => {
      const schema: JsonSchemaObjectType = {
        anyOf: [{ type: 'string' }, { type: 'number' }],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.anyOf).toEqual([{ $ref: '#/$defs/anyOf_0' }, { $ref: '#/$defs/anyOf_1' }]);
    });

    it('should flatten oneOf schemas', () => {
      const schema: JsonSchemaObjectType = {
        oneOf: [{ const: 'a' }, { const: 'b' }],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.oneOf).toEqual([{ $ref: '#/$defs/oneOf_0' }, { $ref: '#/$defs/oneOf_1' }]);
    });

    it('should flatten not schema', () => {
      const schema: JsonSchemaObjectType = {
        not: { type: 'null' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.not).toEqual({ $ref: '#/$defs/not' });
      expect(result.$defs?.not).toEqual({ type: 'null' });
    });
  });

  describe('conditional schemas', () => {
    it('should flatten if/then/else schemas', () => {
      const schema: JsonSchemaObjectType = {
        if: { properties: { kind: { const: 'a' } } },
        then: { required: ['value'] },
        else: { required: ['other'] },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.if).toEqual({ $ref: '#/$defs/if' });
      expect(result.then).toEqual({ $ref: '#/$defs/then' });
      expect(result.else).toEqual({ $ref: '#/$defs/else' });
    });
  });

  describe('additionalProperties', () => {
    it('should flatten additionalProperties schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        additionalProperties: { type: 'string' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.additionalProperties).toEqual({ $ref: '#/$defs/additionalProperties' });
      expect(result.$defs?.additionalProperties).toEqual({ type: 'string' });
    });

    it('should not flatten boolean additionalProperties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        additionalProperties: false,
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.additionalProperties).toBe(false);
    });
  });

  describe('other schema-valued properties', () => {
    it('should flatten contains schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        contains: { type: 'number' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.contains).toEqual({ $ref: '#/$defs/contains' });
    });

    it('should flatten propertyNames schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        propertyNames: { pattern: '^[a-z]+$' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.propertyNames).toEqual({ $ref: '#/$defs/propertyNames' });
    });

    it('should flatten unevaluatedItems schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        unevaluatedItems: { type: 'string' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.unevaluatedItems).toEqual({ $ref: '#/$defs/unevaluatedItems' });
    });

    it('should flatten unevaluatedProperties schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        unevaluatedProperties: { type: 'string' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.unevaluatedProperties).toEqual({ $ref: '#/$defs/unevaluatedProperties' });
    });
  });

  describe('record properties', () => {
    it('should flatten patternProperties schemas', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        patternProperties: {
          '^S_': { type: 'string' },
          '^I_': { type: 'integer' },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.patternProperties?.['^S_']).toEqual({ $ref: '#/$defs/patternProperties_^S_' });
      expect(result.patternProperties?.['^I_']).toEqual({ $ref: '#/$defs/patternProperties_^I_' });
    });

    it('should flatten dependentSchemas', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        dependentSchemas: {
          credit_card: { required: ['billing_address'] },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.dependentSchemas?.credit_card).toEqual({
        $ref: '#/$defs/dependentSchemas_credit_card',
      });
    });
  });

  describe('existing $defs', () => {
    it('should preserve existing $defs', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Existing: { type: 'string' },
        },
        properties: {
          name: { type: 'string' },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.Existing).toEqual({ type: 'string' });
      expect(result.$defs?.name).toEqual({ type: 'string' });
    });

    it('should handle name collisions with existing $defs', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          name: { type: 'number' },
        },
        properties: {
          name: { type: 'string' },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.name).toEqual({ type: 'number' });
      expect(result.$defs?.name_1).toEqual({ type: 'string' });
      expect(result.properties?.name).toEqual({ $ref: '#/$defs/name_1' });
    });
  });

  describe('existing $ref', () => {
    it('should not modify existing $ref', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Name: { type: 'string' },
        },
        properties: {
          name: { $ref: '#/$defs/Name' },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.properties?.name).toEqual({ $ref: '#/$defs/Name' });
    });
  });

  describe('deeply nested schemas', () => {
    it('should flatten deeply nested structures', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.level1).toBeDefined();
      expect(result.$defs?.level1_level2).toBeDefined();
      expect(result.$defs?.level1_level2_level3).toBeDefined();
    });
  });

  describe('complex schemas', () => {
    it('should handle schema with multiple nested constructs', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: { type: 'number' },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.name).toEqual({ type: 'string' });
      expect(result.$defs?.tags).toBeDefined();
      expect(result.$defs?.tags_items).toEqual({ type: 'string' });
      expect(result.$defs?.additionalProperties).toEqual({ type: 'number' });
    });
  });

  describe('contentSchema', () => {
    it('should flatten contentSchema', () => {
      const schema: JsonSchemaObjectType = {
        contentMediaType: 'application/json',
        contentSchema: { type: 'object', properties: { name: { type: 'string' } } },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.contentSchema).toEqual({ $ref: '#/$defs/contentSchema' });
      expect(result.$defs?.contentSchema).toBeDefined();
      expect(result.$defs?.contentSchema_name).toEqual({ type: 'string' });
    });
  });

  describe('empty arrays', () => {
    it('should handle empty allOf array', () => {
      const schema: JsonSchemaObjectType = {
        allOf: [],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.allOf).toEqual([]);
      expect(result.$defs).toBeUndefined();
    });

    it('should handle empty prefixItems array', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        prefixItems: [],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.prefixItems).toEqual([]);
    });

    it('should handle empty properties object', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {},
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.properties).toEqual({});
    });
  });

  describe('flattening inside existing $defs', () => {
    it('should flatten nested schemas within existing $defs', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Person: {
            type: 'object',
            properties: {
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                },
              },
            },
          },
        },
        $ref: '#/$defs/Person',
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.Person).toBeDefined();
      expect(result.$defs?.Person_address).toBeDefined();
      expect(result.$defs?.Person_address_street).toEqual({ type: 'string' });
    });
  });

  describe('mixed nesting', () => {
    it('should flatten allOf inside properties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          value: {
            allOf: [{ type: 'string' }, { minLength: 1 }],
          },
        },
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.properties?.value).toEqual({ $ref: '#/$defs/value' });
      expect(result.$defs?.value_allOf_0).toEqual({ type: 'string' });
      expect(result.$defs?.value_allOf_1).toEqual({ minLength: 1 });
    });

    it('should flatten properties inside anyOf', () => {
      const schema: JsonSchemaObjectType = {
        anyOf: [
          {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
          { type: 'null' },
        ],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.$defs?.anyOf_0_name).toEqual({ type: 'string' });
      expect(result.$defs?.anyOf_1).toEqual({ type: 'null' });
    });
  });

  describe('boolean schemas in arrays', () => {
    it('should handle boolean schema in allOf', () => {
      const schema: JsonSchemaObjectType = {
        allOf: [true, { type: 'string' }],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.allOf).toEqual([true, { $ref: '#/$defs/allOf_1' }]);
      expect(result.$defs?.allOf_1).toEqual({ type: 'string' });
    });

    it('should handle all boolean schemas in oneOf', () => {
      const schema: JsonSchemaObjectType = {
        oneOf: [true, false],
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result.oneOf).toEqual([true, false]);
      expect(result.$defs).toBeUndefined();
    });
  });

  describe('root level $ref only', () => {
    it('should handle schema that is only a $ref', () => {
      const schema: JsonSchemaObjectType = {
        $ref: '#/$defs/SomeType',
      };

      const result = new SchemaFlattener(schema).flatten();

      expect(result).toEqual({ $ref: '#/$defs/SomeType' });
      expect(result.$defs).toBeUndefined();
    });
  });
});
