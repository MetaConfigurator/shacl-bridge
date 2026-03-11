import { GraphBuilder } from '../../src/graph/graph-builder';
import { JsonSchemaObjectType } from '../../src/json-schema/meta/json-schema-type';

describe('GraphBuilder', () => {
  describe('simple schemas', () => {
    it('should create a root node for empty schema', () => {
      const schema: JsonSchemaObjectType = {};

      const graph = new GraphBuilder(schema).build();

      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].key).toBe('root');
      expect(graph.nodes[0].value).toEqual({});
      expect(graph.edges).toHaveLength(0);
    });

    it('should create nodes for primitive properties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'string',
        minLength: 5,
        pattern: '^[a-z]+$',
      };

      const graph = new GraphBuilder(schema).build();

      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges).toHaveLength(3);

      const typeEdge = graph.edges.find((e) => e.label === 'type');
      expect(typeEdge?.to.value).toBe('string');

      const minLengthEdge = graph.edges.find((e) => e.label === 'minLength');
      expect(minLengthEdge?.to.value).toBe(5);

      const patternEdge = graph.edges.find((e) => e.label === 'pattern');
      expect(patternEdge?.to.value).toBe('^[a-z]+$');
    });

    it('should create node for boolean property', () => {
      const schema: JsonSchemaObjectType = {
        uniqueItems: true,
        deprecated: false,
      };

      const graph = new GraphBuilder(schema).build();

      const uniqueItemsEdge = graph.edges.find((e) => e.label === 'uniqueItems');
      expect(uniqueItemsEdge?.to.value).toBe(true);

      const deprecatedEdge = graph.edges.find((e) => e.label === 'deprecated');
      expect(deprecatedEdge?.to.value).toBe(false);
    });

    it('should create node for array of primitives', () => {
      const schema: JsonSchemaObjectType = {
        enum: ['red', 'green', 'blue'],
        required: ['name', 'age'],
      };

      const graph = new GraphBuilder(schema).build();

      const enumEdge = graph.edges.find((e) => e.label === 'enum');
      expect(enumEdge?.to.value).toEqual(['red', 'green', 'blue']);

      const requiredEdge = graph.edges.find((e) => e.label === 'required');
      expect(requiredEdge?.to.value).toEqual(['name', 'age']);
    });
  });

  describe('$defs', () => {
    it('should create nodes for each definition', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Name: { type: 'string' },
          Age: { type: 'integer' },
        },
      };

      const graph = new GraphBuilder(schema).build();

      const defsEdges = graph.edges.filter((e) => e.label === '$defs');
      expect(defsEdges).toHaveLength(2);

      const nameEdge = defsEdges.find((e) => e.propertyKey === 'Name');
      expect(nameEdge?.to.key).toBe('$defs/Name');
      expect(nameEdge?.to.value).toEqual({ type: 'string' });

      const ageEdge = defsEdges.find((e) => e.propertyKey === 'Age');
      expect(ageEdge?.to.key).toBe('$defs/Age');
      expect(ageEdge?.to.value).toEqual({ type: 'integer' });
    });
  });

  describe('properties', () => {
    it('should create nodes for each property', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };

      const graph = new GraphBuilder(schema).build();

      const propEdges = graph.edges.filter((e) => e.label === 'properties');
      expect(propEdges).toHaveLength(2);

      const nameEdge = propEdges.find((e) => e.propertyKey === 'name');
      expect(nameEdge?.to.key).toBe('root/properties/name');
      expect(nameEdge?.to.value).toEqual({ type: 'string' });

      const ageEdge = propEdges.find((e) => e.propertyKey === 'age');
      expect(ageEdge?.to.key).toBe('root/properties/age');
    });
  });

  describe('logical operators', () => {
    it('should create nodes for allOf schemas with index', () => {
      const schema: JsonSchemaObjectType = {
        allOf: [{ type: 'object' }, { minProperties: 1 }],
      };

      const graph = new GraphBuilder(schema).build();

      const allOfEdges = graph.edges.filter((e) => e.label === 'allOf');
      expect(allOfEdges).toHaveLength(2);

      const firstEdge = allOfEdges.find((e) => e.index === 0);
      expect(firstEdge?.to.key).toBe('root/allOf/0');
      expect(firstEdge?.to.value).toEqual({ type: 'object' });

      const secondEdge = allOfEdges.find((e) => e.index === 1);
      expect(secondEdge?.to.key).toBe('root/allOf/1');
      expect(secondEdge?.to.value).toEqual({ minProperties: 1 });
    });

    it('should create nodes for anyOf schemas with index', () => {
      const schema: JsonSchemaObjectType = {
        anyOf: [{ type: 'string' }, { type: 'number' }],
      };

      const graph = new GraphBuilder(schema).build();

      const anyOfEdges = graph.edges.filter((e) => e.label === 'anyOf');
      expect(anyOfEdges).toHaveLength(2);
      expect(anyOfEdges[0].index).toBe(0);
      expect(anyOfEdges[1].index).toBe(1);
    });

    it('should create nodes for oneOf schemas with index', () => {
      const schema: JsonSchemaObjectType = {
        oneOf: [{ const: 'a' }, { const: 'b' }],
      };

      const graph = new GraphBuilder(schema).build();

      const oneOfEdges = graph.edges.filter((e) => e.label === 'oneOf');
      expect(oneOfEdges).toHaveLength(2);
    });

    it('should create node for not schema', () => {
      const schema: JsonSchemaObjectType = {
        not: { type: 'null' },
      };

      const graph = new GraphBuilder(schema).build();

      const notEdge = graph.edges.find((e) => e.label === 'not');
      expect(notEdge?.to.key).toBe('root/not');
      expect(notEdge?.to.value).toEqual({ type: 'null' });
    });
  });

  describe('$ref', () => {
    it('should create node for $ref string', () => {
      const schema: JsonSchemaObjectType = {
        $ref: '#/$defs/Name',
      };

      const graph = new GraphBuilder(schema).build();

      const refEdge = graph.edges.find((e) => e.label === '$ref');
      expect(refEdge?.to.value).toBe('#/$defs/Name');
    });
  });

  describe('nested schemas', () => {
    it('should create node for items schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        items: { type: 'string' },
      };

      const graph = new GraphBuilder(schema).build();

      const itemsEdge = graph.edges.find((e) => e.label === 'items');
      expect(itemsEdge?.to.key).toBe('root/items');
      expect(itemsEdge?.to.value).toEqual({ type: 'string' });
    });

    it('should create node for additionalProperties schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        additionalProperties: { type: 'string' },
      };

      const graph = new GraphBuilder(schema).build();

      const addPropsEdge = graph.edges.find((e) => e.label === 'additionalProperties');
      expect(addPropsEdge?.to.key).toBe('root/additionalProperties');
      expect(addPropsEdge?.to.value).toEqual({ type: 'string' });
    });

    it('should handle boolean additionalProperties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        additionalProperties: false,
      };

      const graph = new GraphBuilder(schema).build();

      const addPropsEdge = graph.edges.find((e) => e.label === 'additionalProperties');
      expect(addPropsEdge?.to.value).toBe(false);
    });
  });

  describe('recursive graph building', () => {
    it('should recursively build graph for nested schema objects', () => {
      const schema: JsonSchemaObjectType = {
        $defs: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
        },
      };

      const graph = new GraphBuilder(schema).build();

      const streetNode = graph.nodes.find((n) => n.key === '$defs/Address/properties/street');
      expect(streetNode).toBeDefined();
      expect(streetNode?.value).toEqual({ type: 'string' });

      const streetTypeEdge = graph.edges.find(
        (e) => e.from.key === '$defs/Address/properties/street' && e.label === 'type'
      );
      expect(streetTypeEdge?.to.value).toBe('string');
    });
  });

  describe('conditional schemas', () => {
    it('should create nodes for if/then/else schemas', () => {
      const schema: JsonSchemaObjectType = {
        if: { properties: { kind: { const: 'a' } } },
        then: { properties: { value: { type: 'string' } } },
        else: { properties: { value: { type: 'number' } } },
      };

      const graph = new GraphBuilder(schema).build();

      const ifEdge = graph.edges.find((e) => e.label === 'if');
      expect(ifEdge?.to.key).toBe('root/if');

      const thenEdge = graph.edges.find((e) => e.label === 'then');
      expect(thenEdge?.to.key).toBe('root/then');

      const elseEdge = graph.edges.find((e) => e.label === 'else');
      expect(elseEdge?.to.key).toBe('root/else');
    });
  });

  describe('additional schema-valued properties', () => {
    it('should create node for contains schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        contains: { type: 'number' },
      };

      const graph = new GraphBuilder(schema).build();

      const containsEdge = graph.edges.find((e) => e.label === 'contains');
      expect(containsEdge?.to.key).toBe('root/contains');
      expect(containsEdge?.to.value).toEqual({ type: 'number' });
    });

    it('should create node for propertyNames schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        propertyNames: { pattern: '^[a-z]+$' },
      };

      const graph = new GraphBuilder(schema).build();

      const propNamesEdge = graph.edges.find((e) => e.label === 'propertyNames');
      expect(propNamesEdge?.to.key).toBe('root/propertyNames');
      expect(propNamesEdge?.to.value).toEqual({ pattern: '^[a-z]+$' });
    });

    it('should create nodes for prefixItems with index', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        prefixItems: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
      };

      const graph = new GraphBuilder(schema).build();

      const prefixItemsEdges = graph.edges.filter((e) => e.label === 'prefixItems');
      expect(prefixItemsEdges).toHaveLength(3);

      expect(prefixItemsEdges[0].index).toBe(0);
      expect(prefixItemsEdges[0].to.key).toBe('root/prefixItems/0');
      expect(prefixItemsEdges[0].to.value).toEqual({ type: 'string' });

      expect(prefixItemsEdges[1].index).toBe(1);
      expect(prefixItemsEdges[2].index).toBe(2);
    });

    it('should create node for unevaluatedItems schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'array',
        unevaluatedItems: { type: 'string' },
      };

      const graph = new GraphBuilder(schema).build();

      const unevalItemsEdge = graph.edges.find((e) => e.label === 'unevaluatedItems');
      expect(unevalItemsEdge?.to.key).toBe('root/unevaluatedItems');
    });

    it('should create node for unevaluatedProperties schema', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        unevaluatedProperties: false,
      };

      const graph = new GraphBuilder(schema).build();

      const unevalPropsEdge = graph.edges.find((e) => e.label === 'unevaluatedProperties');
      expect(unevalPropsEdge?.to.value).toBe(false);
    });

    it('should create node for contentSchema', () => {
      const schema: JsonSchemaObjectType = {
        contentMediaType: 'application/json',
        contentSchema: { type: 'object' },
      };

      const graph = new GraphBuilder(schema).build();

      const contentSchemaEdge = graph.edges.find((e) => e.label === 'contentSchema');
      expect(contentSchemaEdge?.to.key).toBe('root/contentSchema');
      expect(contentSchemaEdge?.to.value).toEqual({ type: 'object' });
    });
  });

  describe('record properties', () => {
    it('should create nodes for patternProperties', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        patternProperties: {
          '^S_': { type: 'string' },
          '^I_': { type: 'integer' },
        },
      };

      const graph = new GraphBuilder(schema).build();

      const patternPropEdges = graph.edges.filter((e) => e.label === 'patternProperties');
      expect(patternPropEdges).toHaveLength(2);

      const stringPatternEdge = patternPropEdges.find((e) => e.propertyKey === '^S_');
      expect(stringPatternEdge?.to.key).toBe('root/patternProperties/^S_');
      expect(stringPatternEdge?.to.value).toEqual({ type: 'string' });

      const intPatternEdge = patternPropEdges.find((e) => e.propertyKey === '^I_');
      expect(intPatternEdge?.to.key).toBe('root/patternProperties/^I_');
    });

    it('should create nodes for dependentSchemas', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        dependentSchemas: {
          creditCard: { properties: { billingAddress: { type: 'string' } } },
        },
      };

      const graph = new GraphBuilder(schema).build();

      const depSchemaEdges = graph.edges.filter((e) => e.label === 'dependentSchemas');
      expect(depSchemaEdges).toHaveLength(1);

      expect(depSchemaEdges[0].propertyKey).toBe('creditCard');
      expect(depSchemaEdges[0].to.key).toBe('root/dependentSchemas/creditCard');
    });

    it('should create nodes for definitions (legacy syntax)', () => {
      const schema: JsonSchemaObjectType = {
        definitions: {
          Name: { type: 'string' },
        },
      };

      const graph = new GraphBuilder(schema).build();

      const defsEdges = graph.edges.filter((e) => e.label === 'definitions');
      expect(defsEdges).toHaveLength(1);

      expect(defsEdges[0].propertyKey).toBe('Name');
      expect(defsEdges[0].to.key).toBe('definitions/Name');
    });
  });

  describe('edge cases', () => {
    it('should handle empty allOf array', () => {
      const schema: JsonSchemaObjectType = {
        allOf: [],
      };

      const graph = new GraphBuilder(schema).build();

      const allOfEdges = graph.edges.filter((e) => e.label === 'allOf');
      expect(allOfEdges).toHaveLength(0);
    });

    it('should handle empty properties object', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        properties: {},
      };

      const graph = new GraphBuilder(schema).build();

      const propEdges = graph.edges.filter((e) => e.label === 'properties');
      expect(propEdges).toHaveLength(0);
    });

    it('should handle schema with only metadata', () => {
      const schema: JsonSchemaObjectType = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/schema',
        title: 'My Schema',
        description: 'A test schema',
      };

      const graph = new GraphBuilder(schema).build();

      expect(graph.nodes).toHaveLength(5);

      const schemaEdge = graph.edges.find((e) => e.label === '$schema');
      expect(schemaEdge?.to.value).toBe('https://json-schema.org/draft/2020-12/schema');

      const idEdge = graph.edges.find((e) => e.label === '$id');
      expect(idEdge?.to.value).toBe('http://example.org/schema');

      const titleEdge = graph.edges.find((e) => e.label === 'title');
      expect(titleEdge?.to.value).toBe('My Schema');

      const descEdge = graph.edges.find((e) => e.label === 'description');
      expect(descEdge?.to.value).toBe('A test schema');
    });

    it('should handle custom extension properties (x-shacl-*)', () => {
      const schema: JsonSchemaObjectType = {
        type: 'object',
        'x-shacl-severity': 'sh:Warning',
        'x-shacl-message': {
          type: 'literal',
          value: 'Validation failed',
        },
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
        },
      };

      const graph = new GraphBuilder(schema).build();

      const severityEdge = graph.edges.find((e) => e.label === 'x-shacl-severity');
      expect(severityEdge?.to.value).toBe('sh:Warning');

      const messageEdge = graph.edges.find((e) => e.label === 'x-shacl-message');
      expect(messageEdge?.to.value).toEqual({
        type: 'literal',
        value: 'Validation failed',
      });

      const prefixesEdge = graph.edges.find((e) => e.label === 'x-shacl-prefixes');
      expect(prefixesEdge?.to.value).toEqual({
        sh: 'http://www.w3.org/ns/shacl#',
        ex: 'http://example.org/',
      });
    });

    it('should handle null value in const', () => {
      const schema: JsonSchemaObjectType = {
        const: null,
      };

      const graph = new GraphBuilder(schema).build();

      const constEdge = graph.edges.find((e) => e.label === 'const');
      expect(constEdge?.to.value).toBeNull();
    });

    it('should handle type as array', () => {
      const schema: JsonSchemaObjectType = {
        type: ['string', 'null'],
      };

      const graph = new GraphBuilder(schema).build();

      const typeEdge = graph.edges.find((e) => e.label === 'type');
      expect(typeEdge?.to.value).toEqual(['string', 'null']);
    });
  });
});
