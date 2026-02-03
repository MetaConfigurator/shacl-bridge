import { DataFactory, Store, Term } from 'n3';
import { NodeProcessor } from './node-processor';
import { WriterContext } from '../writer/writer-context';
import { GraphBuilder } from '../../graph/graph-builder';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  SHACL_AND,
  SHACL_DATATYPE,
  SHACL_MIN_COUNT,
  SHACL_MIN_LENGTH,
  SHACL_NODE,
  SHACL_NOT,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_XONE,
  XSD_INTEGER,
  XSD_STRING,
} from '../../util/rdf-terms';

const EX = 'http://example.org/';

function getObjectTerms(store: Store, subject: string, predicate: string): Term[] {
  return store.getObjects(DataFactory.namedNode(subject), DataFactory.namedNode(predicate), null);
}

function getObject(store: Store, subject: string, predicate: string): string | undefined {
  return getObjectTerms(store, subject, predicate)[0]?.value;
}

function getObjectFromBlank(store: Store, blankTerm: Term, predicate: string): string | undefined {
  return store.getObjects(blankTerm, DataFactory.namedNode(predicate), null)[0]?.value;
}

function getListItems(store: Store, listHead: Term): string[] {
  const items: string[] = [];
  let current = listHead;

  while (current && current.value !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
    const first = store.getObjects(current, DataFactory.namedNode(RDF_FIRST), null)[0];
    if (first) items.push(first.value);

    const rest = store.getObjects(
      current,
      DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
      null
    )[0];
    current = rest;
  }

  return items;
}

function processSchema(schema: JsonSchemaObjectType): Store {
  const context = new WriterContext(schema);
  const graph = new GraphBuilder(schema).build();
  const processor = new NodeProcessor(context, graph);

  const rootNode = graph.nodes.find((n) => n.key === 'root');
  if (rootNode) {
    processor.process(rootNode, context.shapeUri);
  }

  return context.store.build();
}

describe('NodeProcessor', () => {
  describe('$defs processing', () => {
    it('should create shapes for each $def', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        $defs: {
          Name: { type: 'string' },
          Age: { type: 'integer' },
        },
      };

      const store = processSchema(schema);

      expect(getObject(store, `${EX}Name`, SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getObject(store, `${EX}Age`, SHACL_DATATYPE)).toBe(XSD_INTEGER);
    });

    it('should process constraints within $defs', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        $defs: {
          Name: { type: 'string', minLength: 1 },
        },
      };

      const store = processSchema(schema);

      expect(getObject(store, `${EX}Name`, SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getObject(store, `${EX}Name`, SHACL_MIN_LENGTH)).toBe('1');
    });
  });

  describe('properties processing', () => {
    it('should create property shape with sh:path', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const path = getObjectFromBlank(store, propertyTerms[0], SHACL_PATH);
      expect(path).toBe(`${EX}name`);
    });

    it('should add sh:minCount 1 for required properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      const minCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MIN_COUNT);
      expect(minCount).toBe('1');
    });

    it('should map property constraints to blank node', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
        },
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      const datatype = getObjectFromBlank(store, propertyTerms[0], SHACL_DATATYPE);
      const minLength = getObjectFromBlank(store, propertyTerms[0], SHACL_MIN_LENGTH);

      expect(datatype).toBe(XSD_STRING);
      expect(minLength).toBe('1');
    });

    it('should handle property with $ref', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        $defs: {
          NameType: { type: 'string' },
        },
        properties: {
          name: { $ref: '#/$defs/NameType' },
        },
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      const node = getObjectFromBlank(store, propertyTerms[0], SHACL_NODE);
      expect(node).toBe(`${EX}NameType`);
    });

    it('should handle multiple properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(2);
    });
  });

  describe('logical operators', () => {
    it('should map allOf to sh:and', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        $defs: {
          A: { type: 'string' },
          B: { minLength: 1 },
        },
        allOf: [{ $ref: '#/$defs/A' }, { $ref: '#/$defs/B' }],
      };

      const store = processSchema(schema);

      const andTerms = getObjectTerms(store, `${EX}Shape`, SHACL_AND);
      expect(andTerms.length).toBe(1);

      const items = getListItems(store, andTerms[0]);
      expect(items).toContain(`${EX}A`);
      expect(items).toContain(`${EX}B`);
    });

    it('should map anyOf to sh:or', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        $defs: {
          A: { type: 'string' },
          B: { type: 'number' },
        },
        anyOf: [{ $ref: '#/$defs/A' }, { $ref: '#/$defs/B' }],
      };

      const store = processSchema(schema);

      const orTerms = getObjectTerms(store, `${EX}Shape`, SHACL_OR);
      expect(orTerms.length).toBe(1);

      const items = getListItems(store, orTerms[0]);
      expect(items).toContain(`${EX}A`);
      expect(items).toContain(`${EX}B`);
    });

    it('should map oneOf to sh:xone', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        $defs: {
          A: { const: 'a' },
          B: { const: 'b' },
        },
        oneOf: [{ $ref: '#/$defs/A' }, { $ref: '#/$defs/B' }],
      };

      const store = processSchema(schema);

      const xoneTerms = getObjectTerms(store, `${EX}Shape`, SHACL_XONE);
      expect(xoneTerms.length).toBe(1);

      const items = getListItems(store, xoneTerms[0]);
      expect(items).toContain(`${EX}A`);
      expect(items).toContain(`${EX}B`);
    });

    it('should map not to sh:not', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        $defs: {
          Null: { type: 'null' },
        },
        not: { $ref: '#/$defs/Null' },
      };

      const store = processSchema(schema);

      expect(getObject(store, `${EX}Shape`, SHACL_NOT)).toBe(`${EX}Null`);
    });
  });

  describe('$ref handling', () => {
    it('should map root $ref to sh:node', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        $defs: {
          Person: { type: 'object' },
        },
        $ref: '#/$defs/Person',
      };

      const store = processSchema(schema);

      expect(getObject(store, `${EX}Root`, SHACL_NODE)).toBe(`${EX}Person`);
    });
  });

  describe('items handling', () => {
    it('should map items $ref to sh:node', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ArrayShape`,
        type: 'array',
        $defs: {
          Item: { type: 'string' },
        },
        items: { $ref: '#/$defs/Item' },
      };

      const store = processSchema(schema);

      expect(getObject(store, `${EX}ArrayShape`, SHACL_NODE)).toBe(`${EX}Item`);
    });
  });
});
