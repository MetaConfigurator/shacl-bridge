import { DataFactory, Store, Term } from 'n3';
import { NodeProcessor } from '../../../src/shacl/graph-processor/node-processor';
import { WriterContext } from '../../../src/shacl/writer/writer-context';
import { GraphBuilder } from '../../../src/graph/graph-builder';
import { JsonSchemaObjectType } from '../../../src/json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  RDF_TYPE,
  SHACL_AND,
  SHACL_DATATYPE,
  SHACL_HAS_VALUE,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_MIN_LENGTH,
  SHACL_NODE,
  SHACL_NODE_SHAPE,
  SHACL_NOT,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_XONE,
  XSD_INTEGER,
  XSD_STRING,
} from '../../../src/shacl/shacl-terms';

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

  while (current.value !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
    const first = store.getObjects(current, DataFactory.namedNode(RDF_FIRST), null)[0];
    items.push(first.value);
    current = store.getObjects(
      current,
      DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
      null
    )[0];
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

    it('should map allOf with inline properties schema to sh:and with blank node shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        allOf: [
          { properties: { name: { type: 'string' } }, required: ['name'] },
          { properties: { age: { type: 'integer' } } },
        ],
      };

      const store = processSchema(schema);

      const andTerms = getObjectTerms(store, `${EX}Shape`, SHACL_AND);
      expect(andTerms.length).toBe(1);

      const listItems = getListItems(store, andTerms[0]);
      expect(listItems.length).toBe(2);

      const firstItemProps = store.getObjects(
        DataFactory.blankNode(listItems[0]),
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(firstItemProps.length).toBe(1);
      expect(getObjectFromBlank(store, firstItemProps[0], SHACL_PATH)).toBe(`${EX}name`);
      expect(getObjectFromBlank(store, firstItemProps[0], SHACL_MIN_COUNT)).toBe('1');
    });

    it('should map anyOf with inline properties schema to sh:or with blank node shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        anyOf: [
          { properties: { email: { type: 'string' } }, required: ['email'] },
          { properties: { phone: { type: 'string' } }, required: ['phone'] },
        ],
      };

      const store = processSchema(schema);

      const orTerms = getObjectTerms(store, `${EX}Shape`, SHACL_OR);
      expect(orTerms.length).toBe(1);

      const listItems = getListItems(store, orTerms[0]);
      expect(listItems.length).toBe(2);

      const firstItemProps = store.getObjects(
        DataFactory.blankNode(listItems[0]),
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(firstItemProps.length).toBe(1);
      expect(getObjectFromBlank(store, firstItemProps[0], SHACL_PATH)).toBe(`${EX}email`);
    });

    it('should map oneOf with inline properties schema to sh:xone with blank node shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        oneOf: [
          { properties: { type: { const: 'undergraduate' } } },
          { properties: { type: { const: 'graduate' } } },
        ],
      };

      const store = processSchema(schema);

      const xoneTerms = getObjectTerms(store, `${EX}Shape`, SHACL_XONE);
      expect(xoneTerms.length).toBe(1);

      const listItems = getListItems(store, xoneTerms[0]);
      expect(listItems.length).toBe(2);

      for (const itemId of listItems) {
        const itemProps = store.getObjects(
          DataFactory.blankNode(itemId),
          DataFactory.namedNode(SHACL_PROPERTY),
          null
        );
        expect(itemProps.length).toBe(1);
        expect(getObjectFromBlank(store, itemProps[0], SHACL_PATH)).toBe(`${EX}type`);
      }
    });

    it('should map not with inline properties schema to sh:not blank node shape', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        not: { properties: { status: { const: 'expelled' } } },
      };

      const store = processSchema(schema);

      const notTerms = getObjectTerms(store, `${EX}Shape`, SHACL_NOT);
      expect(notTerms.length).toBe(1);
      expect(notTerms[0].termType).toBe('BlankNode');

      const propTerms = store.getObjects(notTerms[0], DataFactory.namedNode(SHACL_PROPERTY), null);
      expect(propTerms.length).toBe(1);
      expect(getObjectFromBlank(store, propTerms[0], SHACL_PATH)).toBe(`${EX}status`);
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

  describe('if/then/else handling', () => {
    it('should map if/then to sh:or( [sh:not if] then )', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        if: { properties: { type: { const: 'graduate' } } },
        then: { properties: { advisor: { type: 'string' } }, required: ['advisor'] },
      };

      const store = processSchema(schema);

      const orTerms = getObjectTerms(store, `${EX}Shape`, SHACL_OR);
      expect(orTerms.length).toBe(1);

      const items = getListItems(store, orTerms[0]);
      expect(items.length).toBe(2);

      // First item: sh:not wrapping the if shape
      const notTarget = store.getObjects(
        DataFactory.blankNode(items[0]),
        DataFactory.namedNode(SHACL_NOT),
        null
      )[0];
      expect(notTarget).toBeDefined();

      // not target has the if shape's property (type = 'graduate')
      const notProps = store.getObjects(notTarget, DataFactory.namedNode(SHACL_PROPERTY), null);
      expect(notProps.length).toBe(1);
      expect(getObjectFromBlank(store, notProps[0], SHACL_PATH)).toBe(`${EX}type`);
      expect(getObjectFromBlank(store, notProps[0], SHACL_HAS_VALUE)).toBe('graduate');

      // Second item: then shape (required advisor → sh:minCount 1)
      const thenProps = store.getObjects(
        DataFactory.blankNode(items[1]),
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(thenProps.length).toBe(1);
      expect(getObjectFromBlank(store, thenProps[0], SHACL_PATH)).toBe(`${EX}advisor`);
      expect(getObjectFromBlank(store, thenProps[0], SHACL_MIN_COUNT)).toBe('1');
    });

    it('should map if/else to sh:or( if else )', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        if: { properties: { type: { const: 'graduate' } } },
        else: { properties: { grade: { type: 'string' } }, required: ['grade'] },
      };

      const store = processSchema(schema);

      const orTerms = getObjectTerms(store, `${EX}Shape`, SHACL_OR);
      expect(orTerms.length).toBe(1);

      const items = getListItems(store, orTerms[0]);
      expect(items.length).toBe(2);

      // First item: if shape
      const ifProps = store.getObjects(
        DataFactory.blankNode(items[0]),
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(ifProps.length).toBe(1);
      expect(getObjectFromBlank(store, ifProps[0], SHACL_HAS_VALUE)).toBe('graduate');

      // Second item: else shape (required grade)
      const elseProps = store.getObjects(
        DataFactory.blankNode(items[1]),
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(elseProps.length).toBe(1);
      expect(getObjectFromBlank(store, elseProps[0], SHACL_PATH)).toBe(`${EX}grade`);
      expect(getObjectFromBlank(store, elseProps[0], SHACL_MIN_COUNT)).toBe('1');
    });

    it('should map if/then/else to sh:and( [sh:or([sh:not if] then)] [sh:or(if else)] )', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        if: { properties: { type: { const: 'graduate' } } },
        then: { properties: { advisor: { type: 'string' } }, required: ['advisor'] },
        else: { properties: { grade: { type: 'string' } }, required: ['grade'] },
      };

      const store = processSchema(schema);

      const andTerms = getObjectTerms(store, `${EX}Shape`, SHACL_AND);
      expect(andTerms.length).toBe(1);

      const andItems = getListItems(store, andTerms[0]);
      expect(andItems.length).toBe(2);

      // First and-item: sh:or( [sh:not if] then )
      const firstOr = store.getObjects(
        DataFactory.blankNode(andItems[0]),
        DataFactory.namedNode(SHACL_OR),
        null
      )[0];
      expect(firstOr).toBeDefined();
      const firstOrItems = getListItems(store, firstOr);
      expect(firstOrItems.length).toBe(2);
      // first item has sh:not
      expect(
        store.getObjects(
          DataFactory.blankNode(firstOrItems[0]),
          DataFactory.namedNode(SHACL_NOT),
          null
        )
      ).toHaveLength(1);

      // Second and-item: sh:or( if else )
      const secondOr = store.getObjects(
        DataFactory.blankNode(andItems[1]),
        DataFactory.namedNode(SHACL_OR),
        null
      )[0];
      expect(secondOr).toBeDefined();
      const secondOrItems = getListItems(store, secondOr);
      expect(secondOrItems.length).toBe(2);
      // first item is the if shape (has property with hasValue 'graduate')
      const ifProps = store.getObjects(
        DataFactory.blankNode(secondOrItems[0]),
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(ifProps.length).toBe(1);
      expect(getObjectFromBlank(store, ifProps[0], SHACL_HAS_VALUE)).toBe('graduate');
    });

    it('should not emit anything for if without then or else', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        if: { properties: { type: { const: 'graduate' } } },
      };

      const store = processSchema(schema);

      expect(getObjectTerms(store, `${EX}Shape`, SHACL_OR)).toHaveLength(0);
      expect(getObjectTerms(store, `${EX}Shape`, SHACL_AND)).toHaveLength(0);
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

  describe('array property constraints', () => {
    it('should emit minItems/maxItems on property shape when items is a $ref', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}CourseShape`,
        $defs: { Person: { type: 'object' } },
        type: 'object',
        properties: {
          instructors: {
            type: 'array',
            items: { $ref: '#/$defs/Person' },
            minItems: 1,
            maxItems: 5,
          },
        },
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}CourseShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const minCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MIN_COUNT);
      const maxCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MAX_COUNT);
      const node = getObjectFromBlank(store, propertyTerms[0], SHACL_NODE);

      expect(minCount).toBe('1');
      expect(maxCount).toBe('5');
      expect(node).toBe(`${EX}Person`);
    });

    it('should emit minItems/maxItems on property shape when items has inline constraints', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ListShape`,
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 10,
          },
        },
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}ListShape`, SHACL_PROPERTY);
      const minCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MIN_COUNT);
      const maxCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MAX_COUNT);

      expect(minCount).toBe('2');
      expect(maxCount).toBe('10');
    });
  });

  describe('required without properties', () => {
    it('should create property shapes for required fields with no corresponding properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        required: ['advisor'],
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}Shape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);
      expect(getObjectFromBlank(store, propertyTerms[0], SHACL_PATH)).toBe(`${EX}advisor`);
      expect(getObjectFromBlank(store, propertyTerms[0], SHACL_MIN_COUNT)).toBe('1');
    });

    it('should not double-emit property shapes for required fields that also appear in properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };

      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}Shape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);
    });
  });

  describe('root NodeShape suppression', () => {
    it('should not create a NodeShape for the root when it has only $defs and metadata', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        title: 'My Schema',
        description: 'A description',
        $defs: {
          Person: { type: 'object', properties: { name: { type: 'string' } } },
        },
      };

      const store = processSchema(schema);

      const rootTypeTerms = store.getObjects(
        DataFactory.namedNode(`${EX}Root`),
        DataFactory.namedNode(RDF_TYPE),
        null
      );
      expect(rootTypeTerms.some((t) => t.value === SHACL_NODE_SHAPE)).toBe(false);
    });

    it('should still create a NodeShape for the root when it has properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        title: 'My Schema',
        type: 'object',
        properties: { name: { type: 'string' } },
      };

      const store = processSchema(schema);

      const rootTypeTerms = store.getObjects(
        DataFactory.namedNode(`${EX}Root`),
        DataFactory.namedNode(RDF_TYPE),
        null
      );
      expect(rootTypeTerms.some((t) => t.value === SHACL_NODE_SHAPE)).toBe(true);
    });
  });
});
