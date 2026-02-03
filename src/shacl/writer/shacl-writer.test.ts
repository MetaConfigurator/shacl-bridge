import { DataFactory, Store, Term } from 'n3';
import { ShaclWriter } from './shacl-writer';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  RDF_TYPE,
  SHACL_AND,
  SHACL_BLANK_NODE_OR_IRI,
  SHACL_CLOSED,
  SHACL_DATATYPE,
  SHACL_DESCRIPTION,
  SHACL_HAS_VALUE,
  SHACL_IN,
  SHACL_MAX_COUNT,
  SHACL_MAX_EXCLUSIVE,
  SHACL_MAX_INCLUSIVE,
  SHACL_MAX_LENGTH,
  SHACL_MIN_COUNT,
  SHACL_MIN_EXCLUSIVE,
  SHACL_MIN_INCLUSIVE,
  SHACL_MIN_LENGTH,
  SHACL_NAME,
  SHACL_NODE,
  SHACL_NODE_KIND,
  SHACL_NODE_SHAPE,
  SHACL_NOT,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PATTERN,
  SHACL_PROPERTY,
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
  SHACL_TARGET_CLASS,
  SHACL_XONE,
  XSD_BOOLEAN,
  XSD_DECIMAL,
  XSD_INTEGER,
  XSD_STRING,
} from '../../util/rdf-terms';

const EX = 'http://example.org/';

function getObjectTerms(store: Store, subject: string, predicate: string): Term[] {
  return store.getObjects(DataFactory.namedNode(subject), DataFactory.namedNode(predicate), null);
}

function getObjects(store: Store, subject: string, predicate: string): string[] {
  return getObjectTerms(store, subject, predicate).map((o) => o.value);
}

function getObject(store: Store, subject: string, predicate: string): string | undefined {
  return getObjects(store, subject, predicate)[0];
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

describe('ShaclWriter', () => {
  describe('shape type declarations', () => {
    it('should add rdf:type sh:NodeShape to root shape', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}PersonShape`, RDF_TYPE)).toBe(SHACL_NODE_SHAPE);
    });

    it('should add rdf:type sh:NodeShape to $defs shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        $defs: {
          Person: { type: 'object' },
        },
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Person`, RDF_TYPE)).toBe(SHACL_NODE_SHAPE);
    });

    it('should add sh:targetClass to $defs shapes using the def key as class name', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        $defs: {
          Person: { type: 'object' },
          Address: { type: 'object' },
        },
      };

      const store = new ShaclWriter(schema).build();

      // Target class should be the def key (Person, Address)
      expect(getObject(store, `${EX}Person`, SHACL_TARGET_CLASS)).toBe(`${EX}Person`);
      expect(getObject(store, `${EX}Address`, SHACL_TARGET_CLASS)).toBe(`${EX}Address`);
    });
  });

  describe('metadata', () => {
    it('should map title to sh:name', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        title: 'Person Shape',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}PersonShape`, SHACL_NAME)).toBe('Person Shape');
    });

    it('should map description to sh:description', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        description: 'A shape for validating persons',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}PersonShape`, SHACL_DESCRIPTION)).toBe(
        'A shape for validating persons'
      );
    });
  });

  describe('type mapping', () => {
    it('should map type object to sh:nodeKind BlankNodeOrIRI', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_NODE_KIND)).toBe(SHACL_BLANK_NODE_OR_IRI);
    });

    it('should map type string to sh:datatype xsd:string', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_STRING);
    });

    it('should map type integer to sh:datatype xsd:integer', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'integer',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_INTEGER);
    });

    it('should map type number to sh:datatype xsd:decimal', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'number',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_DECIMAL);
    });

    it('should map type boolean to sh:datatype xsd:boolean', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'boolean',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_BOOLEAN);
    });
  });

  describe('string constraints', () => {
    it('should map minLength to sh:minLength', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        minLength: 5,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_LENGTH)).toBe('5');
    });

    it('should map maxLength to sh:maxLength', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        maxLength: 100,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_LENGTH)).toBe('100');
    });

    it('should map pattern to sh:pattern', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        pattern: '^[a-z]+$',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_PATTERN)).toBe('^[a-z]+$');
    });
  });

  describe('numeric constraints', () => {
    it('should map minimum to sh:minInclusive', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        minimum: 0,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_INCLUSIVE)).toBe('0');
    });

    it('should map maximum to sh:maxInclusive', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        maximum: 100,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_INCLUSIVE)).toBe('100');
    });

    it('should map exclusiveMinimum to sh:minExclusive', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        exclusiveMinimum: 0,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_EXCLUSIVE)).toBe('0');
    });

    it('should map exclusiveMaximum to sh:maxExclusive', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        exclusiveMaximum: 100,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_EXCLUSIVE)).toBe('100');
    });
  });

  describe('cardinality constraints', () => {
    it('should map minItems to sh:minCount', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        minItems: 1,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_COUNT)).toBe('1');
    });

    it('should map maxItems to sh:maxCount', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        maxItems: 10,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_COUNT)).toBe('10');
    });
  });

  describe('value constraints', () => {
    it('should map const to sh:hasValue', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        const: 'fixed-value',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_HAS_VALUE)).toBe('fixed-value');
    });

    it('should map enum to sh:in', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        enum: ['a', 'b', 'c'],
      };

      const store = new ShaclWriter(schema).build();

      const inTerms = getObjectTerms(store, `${EX}Shape`, SHACL_IN);
      expect(inTerms.length).toBe(1);

      const items = getListItems(store, inTerms[0]);
      expect(items).toEqual(['a', 'b', 'c']);
    });
  });

  describe('closed shape', () => {
    it('should map additionalProperties false to sh:closed true', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
        additionalProperties: false,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_CLOSED)).toBe('true');
    });

    it('should map unevaluatedProperties false to sh:closed true', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
        unevaluatedProperties: false,
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_CLOSED)).toBe('true');
    });
  });

  describe('$defs', () => {
    it('should create shapes for each $def', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        $defs: {
          Name: { type: 'string' },
          Age: { type: 'integer' },
        },
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Name`, SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getObject(store, `${EX}Age`, SHACL_DATATYPE)).toBe(XSD_INTEGER);
    });
  });

  describe('properties', () => {
    it('should create property shapes for properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const path = getObjectFromBlank(store, propertyTerms[0], SHACL_PATH);
      expect(path).toBe(`${EX}name`);

      const datatype = getObjectFromBlank(store, propertyTerms[0], SHACL_DATATYPE);
      expect(datatype).toBe(XSD_STRING);
    });

    it('should add sh:maxCount 1 to scalar (non-array) properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(2);

      // Both should have maxCount 1 since they are scalars
      for (const propTerm of propertyTerms) {
        const maxCount = getObjectFromBlank(store, propTerm, SHACL_MAX_COUNT);
        expect(maxCount).toBe('1');
      }
    });

    it('should NOT add sh:maxCount 1 to array properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const maxCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MAX_COUNT);
      expect(maxCount).toBeUndefined();
    });

    it('should set sh:minCount 1 for required properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      const minCount = getObjectFromBlank(store, propertyTerms[0], SHACL_MIN_COUNT);
      expect(minCount).toBe('1');
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

      const store = new ShaclWriter(schema).build();

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
          active: { type: 'boolean' },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(3);
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

      const store = new ShaclWriter(schema).build();

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

      const store = new ShaclWriter(schema).build();

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

      const store = new ShaclWriter(schema).build();

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

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_NOT)).toBe(`${EX}Null`);
    });

    it('should handle oneOf with inline schemas', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        oneOf: [{ type: 'string' }, { type: 'number' }],
      };

      const store = new ShaclWriter(schema).build();

      const xoneTerms = getObjectTerms(store, `${EX}Shape`, SHACL_XONE);
      expect(xoneTerms.length).toBe(1);

      const items = getListItems(store, xoneTerms[0]);
      expect(items.length).toBe(2);
    });

    it('should handle anyOf with inline schemas', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        anyOf: [{ type: 'string' }, { type: 'integer' }],
      };

      const store = new ShaclWriter(schema).build();

      const orTerms = getObjectTerms(store, `${EX}Shape`, SHACL_OR);
      expect(orTerms.length).toBe(1);

      const items = getListItems(store, orTerms[0]);
      expect(items.length).toBe(2);
    });

    it('should handle allOf with inline schemas', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        allOf: [{ minLength: 1 }, { maxLength: 100 }],
      };

      const store = new ShaclWriter(schema).build();

      const andTerms = getObjectTerms(store, `${EX}Shape`, SHACL_AND);
      expect(andTerms.length).toBe(1);

      const items = getListItems(store, andTerms[0]);
      expect(items.length).toBe(2);
    });

    it('should NOT create sh:and for allOf with only if/then/else (no useful content)', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
        allOf: [
          {
            if: { properties: { type: { const: 'a' } } },
            then: { properties: { value: { type: 'string' } } },
          },
        ],
      };

      const store = new ShaclWriter(schema).build();

      // Should not have sh:and since if/then doesn't produce SHACL content
      const andTerms = getObjectTerms(store, `${EX}Shape`, SHACL_AND);
      expect(andTerms.length).toBe(0);
    });
  });

  describe('array items handling', () => {
    it('should handle items with inline schema', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ArrayShape`,
        type: 'array',
        items: { type: 'string', minLength: 1 },
      };

      const store = new ShaclWriter(schema).build();

      const nodeTerms = getObjectTerms(store, `${EX}ArrayShape`, SHACL_NODE);
      expect(nodeTerms.length).toBe(1);

      const datatype = getObjectFromBlank(store, nodeTerms[0], SHACL_DATATYPE);
      expect(datatype).toBe(XSD_STRING);

      const minLength = getObjectFromBlank(store, nodeTerms[0], SHACL_MIN_LENGTH);
      expect(minLength).toBe('1');
    });

    it('should handle contains with sh:qualifiedValueShape', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ArrayShape`,
        type: 'array',
        contains: { type: 'string', const: 'admin' },
      };

      const store = new ShaclWriter(schema).build();

      const qvsTerms = getObjectTerms(store, `${EX}ArrayShape`, SHACL_QUALIFIED_VALUE_SHAPE);
      expect(qvsTerms.length).toBe(1);

      const hasValue = getObjectFromBlank(store, qvsTerms[0], SHACL_HAS_VALUE);
      expect(hasValue).toBe('admin');

      const minCount = getObject(store, `${EX}ArrayShape`, SHACL_QUALIFIED_MIN_COUNT);
      expect(minCount).toBe('1');
    });

    it('should handle contains with minContains', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ArrayShape`,
        type: 'array',
        contains: { type: 'string' },
        minContains: 2,
      };

      const store = new ShaclWriter(schema).build();

      const minCount = getObject(store, `${EX}ArrayShape`, SHACL_QUALIFIED_MIN_COUNT);
      expect(minCount).toBe('2');
    });

    it('should handle contains with maxContains', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ArrayShape`,
        type: 'array',
        contains: { type: 'string' },
        maxContains: 5,
      };

      const store = new ShaclWriter(schema).build();

      const maxCount = getObject(store, `${EX}ArrayShape`, SHACL_QUALIFIED_MAX_COUNT);
      expect(maxCount).toBe('5');
    });
  });

  describe('property with oneOf', () => {
    it('should handle property with oneOf using $refs', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
        $defs: {
          TypeA: { type: 'string' },
          TypeB: { type: 'number' },
        },
        properties: {
          value: {
            oneOf: [{ $ref: '#/$defs/TypeA' }, { $ref: '#/$defs/TypeB' }],
          },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}Shape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const xoneTerms = store.getObjects(propertyTerms[0], DataFactory.namedNode(SHACL_XONE), null);
      expect(xoneTerms.length).toBe(1);

      const items = getListItems(store, xoneTerms[0]);
      expect(items).toContain(`${EX}TypeA`);
      expect(items).toContain(`${EX}TypeB`);
    });
  });

  describe('property with array type', () => {
    it('should handle property with array items $ref', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        $defs: {
          Tag: { type: 'string' },
        },
        properties: {
          tags: {
            type: 'array',
            items: { $ref: '#/$defs/Tag' },
          },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const node = getObjectFromBlank(store, propertyTerms[0], SHACL_NODE);
      expect(node).toBe(`${EX}Tag`);
    });

    it('should handle property with array items inline schema', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string', minLength: 2 },
          },
        },
      };

      const store = new ShaclWriter(schema).build();

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      const nodeTerms = store.getObjects(propertyTerms[0], DataFactory.namedNode(SHACL_NODE), null);
      expect(nodeTerms.length).toBe(1);

      const datatype = getObjectFromBlank(store, nodeTerms[0], SHACL_DATATYPE);
      expect(datatype).toBe(XSD_STRING);

      const minLength = getObjectFromBlank(store, nodeTerms[0], SHACL_MIN_LENGTH);
      expect(minLength).toBe('2');
    });
  });

  describe('nested object properties', () => {
    it('should handle property with inline object schema having nested properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
        },
      };

      const store = new ShaclWriter(schema).build();

      // Check that PersonShape has address property
      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms.length).toBe(1);

      const addressPath = getObjectFromBlank(store, propertyTerms[0], SHACL_PATH);
      expect(addressPath).toBe(`${EX}address`);

      // Check that address has sh:node pointing to a blank node with street property
      const addressNode = store.getObjects(
        propertyTerms[0],
        DataFactory.namedNode(SHACL_NODE),
        null
      )[0];
      expect(addressNode).toBeDefined();

      // Check the nested shape has street property
      const nestedProps = store.getObjects(
        addressNode,
        DataFactory.namedNode(SHACL_PROPERTY),
        null
      );
      expect(nestedProps.length).toBe(1);

      const streetPath = getObjectFromBlank(store, nestedProps[0], SHACL_PATH);
      expect(streetPath).toBe(`${EX}street`);
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

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Root`, SHACL_NODE)).toBe(`${EX}Person`);
    });

    it('should map items $ref to sh:node', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ArrayShape`,
        type: 'array',
        $defs: {
          Item: { type: 'string' },
        },
        items: { $ref: '#/$defs/Item' },
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}ArrayShape`, SHACL_NODE)).toBe(`${EX}Item`);
    });
  });

  describe('format handling', () => {
    it('should map format date-time to xsd:dateTime', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
        format: 'date-time',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(
        'http://www.w3.org/2001/XMLSchema#dateTime'
      );
    });

    it('should map format date to xsd:date', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
        format: 'date',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(
        'http://www.w3.org/2001/XMLSchema#date'
      );
    });

    it('should map format time to xsd:time', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
        format: 'time',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(
        'http://www.w3.org/2001/XMLSchema#time'
      );
    });

    it('should map format uri to sh:nodeKind sh:IRI', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
        format: 'uri',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_NODE_KIND)).toBe(
        'http://www.w3.org/ns/shacl#IRI'
      );
    });

    it('should map format email to sh:pattern', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
        format: 'email',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_PATTERN)).toBeDefined();
    });

    it('should map format uuid to sh:pattern', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'string',
        format: 'uuid',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_PATTERN)).toBeDefined();
    });
  });

  describe('default URI handling', () => {
    it('should use default base URI when $id is not provided', () => {
      const schema: JsonSchemaObjectType = {
        type: 'string',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_STRING);
    });

    it('should extract base URI from $id', () => {
      const schema: JsonSchemaObjectType = {
        $id: 'https://example.com/schemas/Person',
        type: 'object',
      };

      const store = new ShaclWriter(schema).build();

      expect(getObject(store, 'https://example.com/schemas/Person', SHACL_NODE_KIND)).toBe(
        SHACL_BLANK_NODE_OR_IRI
      );
    });
  });
});
