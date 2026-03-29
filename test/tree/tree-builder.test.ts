import { JsonSchemaObjectType } from '../../src/json-schema/meta/json-schema-type';
import { SchemaNode } from '../../src/tree/types';
import { TreeBuilder } from '../../src/tree/tree-builder';

function childrenWithLabel(node: SchemaNode, label: string) {
  return node.children.filter((e) => e.label === label);
}

describe('TreeBuilder', () => {
  describe('simple schemas', () => {
    it('should build a root node for empty schema', () => {
      const node = new TreeBuilder({}).build();

      expect(node.schema).toEqual({});
      expect(node.children).toHaveLength(0);
    });

    it('should not create children for primitive properties', () => {
      const schema: JsonSchemaObjectType = { type: 'string', minLength: 5 };

      const node = new TreeBuilder(schema).build();

      expect(node.schema).toBe(schema);
      expect(node.children).toHaveLength(0);
    });
  });

  describe('$defs', () => {
    it('should create children for each definition', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Name: { type: 'string' },
          Age: { type: 'integer' },
        },
      };

      const node = new TreeBuilder(schema).build();

      const defsChildren = childrenWithLabel(node, '$defs');
      expect(defsChildren).toHaveLength(2);

      const nameEdge = defsChildren.find((e) => e.key === 'Name');
      expect(nameEdge?.node.schema).toEqual({ type: 'string' });

      const ageEdge = defsChildren.find((e) => e.key === 'Age');
      expect(ageEdge?.node.schema).toEqual({ type: 'integer' });
    });
  });

  describe('properties', () => {
    it('should create children for each property', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };

      const node = new TreeBuilder(schema).build();

      const propChildren = childrenWithLabel(node, 'properties');
      expect(propChildren).toHaveLength(2);

      expect(propChildren.find((e) => e.key === 'name')?.node.schema).toEqual({ type: 'string' });
      expect(propChildren.find((e) => e.key === 'age')?.node.schema).toEqual({ type: 'integer' });
    });
  });

  describe('logical operators', () => {
    it('should create indexed children for allOf', () => {
      const schema: JsonSchemaObjectType = {
        allOf: [{ type: 'object' }, { minProperties: 1 }],
      };

      const node = new TreeBuilder(schema).build();

      const allOfChildren = childrenWithLabel(node, 'allOf');
      expect(allOfChildren).toHaveLength(2);
      expect(allOfChildren[0].index).toBe(0);
      expect(allOfChildren[0].node.schema).toEqual({ type: 'object' });
      expect(allOfChildren[1].index).toBe(1);
    });

    it('should create indexed children for anyOf', () => {
      const schema: JsonSchemaObjectType = {
        anyOf: [{ type: 'string' }, { type: 'number' }],
      };

      const node = new TreeBuilder(schema).build();

      const anyOfChildren = childrenWithLabel(node, 'anyOf');
      expect(anyOfChildren).toHaveLength(2);
      expect(anyOfChildren[0].index).toBe(0);
      expect(anyOfChildren[1].index).toBe(1);
    });

    it('should create indexed children for oneOf', () => {
      const schema: JsonSchemaObjectType = {
        oneOf: [{ const: 'a' }, { const: 'b' }],
      };

      const node = new TreeBuilder(schema).build();

      expect(childrenWithLabel(node, 'oneOf')).toHaveLength(2);
    });

    it('should create a child for not', () => {
      const schema: JsonSchemaObjectType = { not: { type: 'null' } };

      const node = new TreeBuilder(schema).build();

      const notChildren = childrenWithLabel(node, 'not');
      expect(notChildren).toHaveLength(1);
      expect(notChildren[0].node.schema).toEqual({ type: 'null' });
    });
  });

  describe('valued keywords', () => {
    it('should create a child for items', () => {
      const schema: JsonSchemaObjectType = { type: 'array', items: { type: 'string' } };

      const node = new TreeBuilder(schema).build();

      const itemsChildren = childrenWithLabel(node, 'items');
      expect(itemsChildren).toHaveLength(1);
      expect(itemsChildren[0].node.schema).toEqual({ type: 'string' });
    });

    it('should create a child for contains', () => {
      const schema: JsonSchemaObjectType = { type: 'array', contains: { type: 'number' } };

      const node = new TreeBuilder(schema).build();

      expect(childrenWithLabel(node, 'contains')[0].node.schema).toEqual({ type: 'number' });
    });

    it('should create a child for if/then/else', () => {
      const schema: JsonSchemaObjectType = {
        if: { properties: { kind: { const: 'a' } } },
        then: { properties: { value: { type: 'string' } } },
        else: { properties: { value: { type: 'number' } } },
      };

      const node = new TreeBuilder(schema).build();

      expect(childrenWithLabel(node, 'if')).toHaveLength(1);
      expect(childrenWithLabel(node, 'then')).toHaveLength(1);
      expect(childrenWithLabel(node, 'else')).toHaveLength(1);
    });

    it('should produce no child edge for boolean additionalProperties', () => {
      const schema: JsonSchemaObjectType = { type: 'object', additionalProperties: false };

      const node = new TreeBuilder(schema).build();

      expect(childrenWithLabel(node, 'additionalProperties')).toHaveLength(0);
    });
  });

  describe('record keywords', () => {
    it('should create children for patternProperties', () => {
      const schema: JsonSchemaObjectType = {
        patternProperties: { '^S_': { type: 'string' }, '^I_': { type: 'integer' } },
      };

      const node = new TreeBuilder(schema).build();

      const children = childrenWithLabel(node, 'patternProperties');
      expect(children).toHaveLength(2);
      expect(children.find((e) => e.key === '^S_')?.node.schema).toEqual({ type: 'string' });
    });

    it('should create children for definitions (legacy)', () => {
      const schema: JsonSchemaObjectType = { definitions: { Name: { type: 'string' } } };

      const node = new TreeBuilder(schema).build();

      const children = childrenWithLabel(node, 'definitions');
      expect(children).toHaveLength(1);
      expect(children[0].key).toBe('Name');
    });
  });

  describe('recursive building', () => {
    it('should recursively build nested schemas', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Address: {
            type: 'object',
            properties: { street: { type: 'string' } },
          },
        },
      };

      const node = new TreeBuilder(schema).build();

      const addressNode = childrenWithLabel(node, '$defs')[0].node;
      const streetNode = childrenWithLabel(addressNode, 'properties')[0].node;
      expect(streetNode.schema).toEqual({ type: 'string' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty allOf', () => {
      const node = new TreeBuilder({ allOf: [] }).build();
      expect(childrenWithLabel(node, 'allOf')).toHaveLength(0);
    });

    it('should handle empty properties', () => {
      const node = new TreeBuilder({ type: 'object', properties: {} }).build();
      expect(childrenWithLabel(node, 'properties')).toHaveLength(0);
    });
  });
});
