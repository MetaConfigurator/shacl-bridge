import { DataFactory } from 'n3';
import { TypeMapper } from '../../../../src/shacl/tree-processor/mapper/type-mapper';
import { WriterContext } from '../../../../src/shacl/writer/writer-context';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  RDF_REST,
  SHACL_BLANK_NODE_OR_IRI,
  SHACL_DATATYPE,
  SHACL_LITERAL,
  SHACL_NODE_KIND,
  SHACL_OR,
  XSD_BOOLEAN,
  XSD_DECIMAL,
  XSD_INTEGER,
  XSD_STRING,
} from '../../../../src/shacl/shacl-terms';
import { EX, getBlankObject, getObject } from '../test-utils';

function buildAndGetStore(schema: JsonSchemaObjectType, subject: string, isBlank = false) {
  const context = new WriterContext({ $id: `${EX}Root` });
  new TypeMapper(context).map(schema, subject, isBlank, new Set());
  return context.store.build();
}

describe('TypeMapper', () => {
  describe('type mapping', () => {
    it('should map object type to sh:nodeKind BlankNodeOrIRI', () => {
      const store = buildAndGetStore({ type: 'object' }, `${EX}Shape`);
      expect(getObject(store, `${EX}Shape`, SHACL_NODE_KIND)).toBe(SHACL_BLANK_NODE_OR_IRI);
    });

    it('should map string type to sh:datatype xsd:string', () => {
      expect(
        getObject(buildAndGetStore({ type: 'string' }, `${EX}Shape`), `${EX}Shape`, SHACL_DATATYPE)
      ).toBe(XSD_STRING);
    });

    it('should map integer type to sh:datatype xsd:integer', () => {
      expect(
        getObject(buildAndGetStore({ type: 'integer' }, `${EX}Shape`), `${EX}Shape`, SHACL_DATATYPE)
      ).toBe(XSD_INTEGER);
    });

    it('should map number type to sh:datatype xsd:decimal', () => {
      expect(
        getObject(buildAndGetStore({ type: 'number' }, `${EX}Shape`), `${EX}Shape`, SHACL_DATATYPE)
      ).toBe(XSD_DECIMAL);
    });

    it('should map boolean type to sh:datatype xsd:boolean', () => {
      expect(
        getObject(buildAndGetStore({ type: 'boolean' }, `${EX}Shape`), `${EX}Shape`, SHACL_DATATYPE)
      ).toBe(XSD_BOOLEAN);
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
      expect(orTerms).toHaveLength(1);

      const first = store.getObjects(orTerms[0], DataFactory.namedNode(RDF_FIRST), null)[0];
      expect(getBlankObject(store, first.value, SHACL_DATATYPE)).toBe(XSD_DECIMAL);

      const rest = store.getObjects(orTerms[0], DataFactory.namedNode(RDF_REST), null)[0];
      const second = store.getObjects(rest, DataFactory.namedNode(RDF_FIRST), null)[0];
      expect(getBlankObject(store, second.value, SHACL_NODE_KIND)).toBe(SHACL_LITERAL);
    });
  });
});
