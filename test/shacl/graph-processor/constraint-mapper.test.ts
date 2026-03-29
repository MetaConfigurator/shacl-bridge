import { DataFactory, Store } from 'n3';
import { WriterContext } from '../../../src/shacl/writer/writer-context';
import { JsonSchemaObjectType } from '../../../src/json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  SHACL_BLANK_NODE_OR_IRI,
  SHACL_CLOSED,
  SHACL_DATATYPE,
  SHACL_DEACTIVATED,
  SHACL_DEFAULT_VALUE,
  SHACL_DESCRIPTION,
  SHACL_HAS_VALUE,
  SHACL_IN,
  SHACL_LITERAL,
  SHACL_MAX_COUNT,
  SHACL_MAX_EXCLUSIVE,
  SHACL_MAX_INCLUSIVE,
  SHACL_MAX_LENGTH,
  SHACL_MIN_COUNT,
  SHACL_MIN_EXCLUSIVE,
  SHACL_MIN_INCLUSIVE,
  SHACL_MIN_LENGTH,
  SHACL_NAME,
  SHACL_NODE_KIND,
  SHACL_OR,
  SHACL_PATTERN,
  XSD_BOOLEAN,
  XSD_DECIMAL,
  XSD_INTEGER,
  XSD_STRING,
} from '../../../src/shacl/shacl-terms';
import { ConstraintMapper } from '../../../src/shacl/tree-processor/constraint-mapper';

const EX = 'http://example.org/';

function getObject(store: Store, subject: string, predicate: string): string | undefined {
  const terms = store.getObjects(
    DataFactory.namedNode(subject),
    DataFactory.namedNode(predicate),
    null
  );
  return terms[0]?.value;
}

function getBlankObject(store: Store, blankId: string, predicate: string): string | undefined {
  const terms = store.getObjects(
    DataFactory.blankNode(blankId),
    DataFactory.namedNode(predicate),
    null
  );
  return terms[0]?.value;
}

function buildAndGetStore(schema: JsonSchemaObjectType, subject: string, isBlank = false): Store {
  const context = new WriterContext({ $id: `${EX}Root` });
  new ConstraintMapper(context).map(schema, subject, isBlank);
  return context.store.build();
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

  describe('type mapping', () => {
    it('should map object type to sh:nodeKind BlankNodeOrIRI', () => {
      const store = buildAndGetStore({ type: 'object' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_NODE_KIND)).toBe(SHACL_BLANK_NODE_OR_IRI);
    });

    it('should map string type to sh:datatype xsd:string', () => {
      const store = buildAndGetStore({ type: 'string' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_STRING);
    });

    it('should map integer type to sh:datatype xsd:integer', () => {
      const store = buildAndGetStore({ type: 'integer' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_INTEGER);
    });

    it('should map number type to sh:datatype xsd:decimal', () => {
      const store = buildAndGetStore({ type: 'number' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_DECIMAL);
    });

    it('should map boolean type to sh:datatype xsd:boolean', () => {
      const store = buildAndGetStore({ type: 'boolean' }, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_BOOLEAN);
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
  });

  describe('union type', () => {
    it('should map type array to sh:or with per-type blank nodes', () => {
      const store = buildAndGetStore({ type: ['number', 'null'] }, `${EX}Shape`);

      const orTerms = store.getObjects(
        DataFactory.namedNode(`${EX}Shape`),
        DataFactory.namedNode(SHACL_OR),
        null
      );
      expect(orTerms.length).toBe(1);

      const first = store.getObjects(orTerms[0], DataFactory.namedNode(RDF_FIRST), null)[0];
      expect(first).toBeDefined();
      expect(getBlankObject(store, first.value, SHACL_DATATYPE)).toBe(XSD_DECIMAL);

      const rest = store.getObjects(
        orTerms[0],
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        null
      )[0];
      const second = store.getObjects(rest, DataFactory.namedNode(RDF_FIRST), null)[0];
      expect(getBlankObject(store, second.value, SHACL_NODE_KIND)).toBe(SHACL_LITERAL);
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

  describe('blank node subject', () => {
    it('should map constraints to blank node when isBlank is true', () => {
      const context = new WriterContext({ $id: `${EX}Root` });
      new ConstraintMapper(context).map({ type: 'string', minLength: 1 }, 'prop_0', true);
      const store = context.store.build();

      expect(getBlankObject(store, 'prop_0', SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getBlankObject(store, 'prop_0', SHACL_MIN_LENGTH)).toBe('1');
    });
  });

  describe('multiple constraints', () => {
    it('should map all constraints from a schema', () => {
      const schema: JsonSchemaObjectType = {
        title: 'Name',
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[A-Za-z]+$',
      };

      const store = buildAndGetStore(schema, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_NAME)).toBe('Name');
      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getObject(store, `${EX}Shape`, SHACL_MIN_LENGTH)).toBe('1');
      expect(getObject(store, `${EX}Shape`, SHACL_MAX_LENGTH)).toBe('100');
      expect(getObject(store, `${EX}Shape`, SHACL_PATTERN)).toBe('^[A-Za-z]+$');
    });
  });
});
