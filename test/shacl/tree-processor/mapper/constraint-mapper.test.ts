import { DataFactory } from 'n3';
import { ConstraintMapper } from '../../../../src/shacl/tree-processor/mapper/constraint-mapper';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  SHACL_CLOSED,
  SHACL_DEACTIVATED,
  SHACL_DEFAULT_VALUE,
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
  SHACL_PATTERN,
  XSD_BOOLEAN,
  XSD_DECIMAL,
  XSD_INTEGER,
} from '../../../../src/shacl/shacl-terms';
import { buildStore, EX, getObject } from '../test-utils';

function buildAndGetStore(schema: JsonSchemaObjectType, subject: string, isBlank = false) {
  return buildStore(`${EX}Root`, (context) => {
    new ConstraintMapper(context).map(schema, subject, isBlank);
  });
}

describe('ConstraintMapper', () => {
  describe('metadata', () => {
    it('should map title to sh:name', () => {
      const store = buildAndGetStore({ title: 'Person Shape' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_NAME)).toBe('Person Shape');
    });

    it('should map description to sh:description', () => {
      const store = buildAndGetStore({ description: 'A shape for persons' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DESCRIPTION)).toBe('A shape for persons');
    });
  });

  describe('string constraints', () => {
    it('should map minLength to sh:minLength', () => {
      const store = buildAndGetStore({ minLength: 5 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_LENGTH)).toBe('5');
    });

    it('should map maxLength to sh:maxLength', () => {
      const store = buildAndGetStore({ maxLength: 100 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_LENGTH)).toBe('100');
    });

    it('should map pattern to sh:pattern', () => {
      const store = buildAndGetStore({ pattern: '^[a-z]+$' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_PATTERN)).toBe('^[a-z]+$');
    });
  });

  describe('numeric constraints', () => {
    it('should map minimum to sh:minInclusive', () => {
      const store = buildAndGetStore({ minimum: 0 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_INCLUSIVE)).toBe('0');
    });

    it('should map maximum to sh:maxInclusive', () => {
      const store = buildAndGetStore({ maximum: 100 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_INCLUSIVE)).toBe('100');
    });

    it('should map exclusiveMinimum to sh:minExclusive', () => {
      const store = buildAndGetStore({ exclusiveMinimum: 0 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_EXCLUSIVE)).toBe('0');
    });

    it('should map exclusiveMaximum to sh:maxExclusive', () => {
      const store = buildAndGetStore({ exclusiveMaximum: 100 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_EXCLUSIVE)).toBe('100');
    });

    it('should use xsd:decimal datatype for float minimum', () => {
      const store = buildAndGetStore({ minimum: 1.1 }, `${EX}Shape`);
      const literal = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_MIN_INCLUSIVE),
        null
      )[0] as import('n3').Literal;

      expect(literal.value).toBe('1.1');
      expect(literal.datatype.value).toBe(XSD_DECIMAL);
    });

    it('should use xsd:decimal datatype for float exclusiveMinimum', () => {
      const store = buildAndGetStore({ exclusiveMinimum: 1.1 }, `${EX}Shape`);
      const literal = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_MIN_EXCLUSIVE),
        null
      )[0] as import('n3').Literal;

      expect(literal.value).toBe('1.1');
      expect(literal.datatype.value).toBe(XSD_DECIMAL);
    });

    it('should use xsd:integer datatype for integer minimum', () => {
      const store = buildAndGetStore({ minimum: 0 }, `${EX}Shape`);
      const literal = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_MIN_INCLUSIVE),
        null
      )[0] as import('n3').Literal;

      expect(literal.datatype.value).toBe(XSD_INTEGER);
    });
  });

  describe('cardinality constraints', () => {
    it('should map minItems to sh:minCount', () => {
      const store = buildAndGetStore({ minItems: 1 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MIN_COUNT)).toBe('1');
    });

    it('should map maxItems to sh:maxCount', () => {
      const store = buildAndGetStore({ maxItems: 10 }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_MAX_COUNT)).toBe('10');
    });
  });

  describe('value constraints', () => {
    it('should map const to sh:hasValue', () => {
      const store = buildAndGetStore({ const: 'fixed' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_HAS_VALUE)).toBe('fixed');
    });

    it('should map numeric const to sh:hasValue with xsd:integer datatype', () => {
      const store = buildAndGetStore({ const: 42 }, `${EX}Shape`);
      const literal = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_HAS_VALUE),
        null
      )[0] as import('n3').Literal;

      expect(literal.value).toBe('42');
      expect(literal.datatype.value).toBe(XSD_INTEGER);
    });

    it('should map boolean const to sh:hasValue with xsd:boolean datatype', () => {
      const store = buildAndGetStore({ const: true }, `${EX}Shape`);
      const literal = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_HAS_VALUE),
        null
      )[0] as import('n3').Literal;

      expect(literal.value).toBe('true');
      expect(literal.datatype.value).toBe(XSD_BOOLEAN);
    });

    it('should map enum to sh:in', () => {
      const store = buildAndGetStore({ enum: ['a', 'b', 'c'] }, `${EX}Shape`);

      const inTerm = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_IN),
        null
      )[0];
      expect(inTerm).toBeDefined();

      const firstItem = store.getObjects(inTerm, DataFactory.namedNode(RDF_FIRST), null)[0];
      expect(firstItem.value).toBe('a');
    });

    it('should map numeric enum to sh:in with xsd:integer datatypes', () => {
      const store = buildAndGetStore({ enum: [1, 2, 3] }, `${EX}Shape`);

      const inTerm = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_IN),
        null
      )[0];
      const firstItem = store.getObjects(
        inTerm,
        DataFactory.namedNode(RDF_FIRST),
        null
      )[0] as import('n3').Literal;

      expect(firstItem.value).toBe('1');
      expect(firstItem.datatype.value).toBe(XSD_INTEGER);
    });
  });

  describe('annotations', () => {
    it('should map deprecated:true to sh:deactivated true', () => {
      const store = buildAndGetStore({ deprecated: true }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DEACTIVATED)).toBe('true');
    });

    it('should not emit sh:deactivated when deprecated is false', () => {
      const store = buildAndGetStore({ deprecated: false }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DEACTIVATED)).toBeUndefined();
    });

    it('should map default to sh:defaultValue', () => {
      const store = buildAndGetStore({ default: 'user' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DEFAULT_VALUE)).toBe('user');
    });

    it('should map numeric default to sh:defaultValue with xsd:integer datatype', () => {
      const store = buildAndGetStore({ default: 10 }, `${EX}Shape`);
      const literal = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_DEFAULT_VALUE),
        null
      )[0] as import('n3').Literal;

      expect(literal.value).toBe('10');
      expect(literal.datatype.value).toBe(XSD_INTEGER);
    });
  });

  describe('closed shape', () => {
    it('should map additionalProperties false to sh:closed true', () => {
      const store = buildAndGetStore({ additionalProperties: false }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_CLOSED)).toBe('true');
    });

    it('should not add sh:closed when additionalProperties is not false', () => {
      const store = buildAndGetStore({ additionalProperties: true }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_CLOSED)).toBeUndefined();
    });
  });
});
