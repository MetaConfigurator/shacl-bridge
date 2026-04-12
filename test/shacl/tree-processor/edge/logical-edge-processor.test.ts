import { DataFactory } from 'n3';
import { LogicalEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/logical-edge-processor';
import { SchemaEdge } from '../../../../src/tree/types';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import { SHACL_AND, SHACL_OR, SHACL_PROPERTY, SHACL_XONE } from '../../../../src/shacl/shacl-terms';
import { buildStore, EX, getListItems, makeEdge, processSchema } from '../test-utils';

const SUBJECT = `${EX}Shape`;

function makeRefEdge(ref: string, label: string): SchemaEdge {
  return makeEdge({ $ref: ref }, label);
}

const PREDICATE_TO_LABEL = new Map([
  [SHACL_AND, 'allOf'],
  [SHACL_OR, 'anyOf'],
  [SHACL_XONE, 'oneOf'],
]);

function buildLogicalStore(edges: SchemaEdge[], predicate: string) {
  const label = PREDICATE_TO_LABEL.get(predicate) ?? '';
  return buildStore(SUBJECT, (context) => {
    new LogicalEdgeProcessor(context, label, predicate).process({
      edges,
      subject: SUBJECT,
      isBlank: false,
    });
  });
}

describe('LogicalEdgeProcessor', () => {
  describe('with $ref edges', () => {
    it('should map allOf refs to sh:and list', () => {
      const store = buildLogicalStore(
        [makeRefEdge(`${EX}A`, 'allOf'), makeRefEdge(`${EX}B`, 'allOf')],
        SHACL_AND
      );

      const andTerms = store.getObjects(
        DataFactory.namedNode(SUBJECT),
        DataFactory.namedNode(SHACL_AND),
        null
      );
      expect(andTerms).toHaveLength(1);
      expect(getListItems(store, andTerms[0])).toEqual(
        expect.arrayContaining([`${EX}A`, `${EX}B`])
      );
    });

    it('should map anyOf refs to sh:or list', () => {
      const store = buildLogicalStore(
        [makeRefEdge(`${EX}A`, 'anyOf'), makeRefEdge(`${EX}B`, 'anyOf')],
        SHACL_OR
      );

      const orTerms = store.getObjects(
        DataFactory.namedNode(SUBJECT),
        DataFactory.namedNode(SHACL_OR),
        null
      );
      expect(orTerms).toHaveLength(1);
      expect(getListItems(store, orTerms[0])).toEqual(expect.arrayContaining([`${EX}A`, `${EX}B`]));
    });

    it('should map oneOf refs to sh:xone list', () => {
      const store = buildLogicalStore(
        [makeRefEdge(`${EX}A`, 'oneOf'), makeRefEdge(`${EX}B`, 'oneOf')],
        SHACL_XONE
      );

      const xoneTerms = store.getObjects(
        DataFactory.namedNode(SUBJECT),
        DataFactory.namedNode(SHACL_XONE),
        null
      );
      expect(xoneTerms).toHaveLength(1);
      expect(getListItems(store, xoneTerms[0])).toEqual(
        expect.arrayContaining([`${EX}A`, `${EX}B`])
      );
    });
  });

  describe('with inline schemas', () => {
    it('should map allOf with inline properties to sh:and list of blank node shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: SUBJECT,
        allOf: [
          { properties: { name: { type: 'string' } }, required: ['name'] },
          { properties: { age: { type: 'integer' } } },
        ],
      };
      const store = processSchema(schema);

      const andTerms = store.getObjects(
        DataFactory.namedNode(SUBJECT),
        DataFactory.namedNode(SHACL_AND),
        null
      );
      expect(andTerms).toHaveLength(1);
      const listItems = getListItems(store, andTerms[0]);
      expect(listItems).toHaveLength(2);
      expect(
        store.getObjects(
          DataFactory.blankNode(listItems[0]),
          DataFactory.namedNode(SHACL_PROPERTY),
          null
        )
      ).toHaveLength(1);
    });

    it('should map anyOf with inline properties to sh:or list of blank node shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: SUBJECT,
        anyOf: [
          { properties: { email: { type: 'string' } }, required: ['email'] },
          { properties: { phone: { type: 'string' } }, required: ['phone'] },
        ],
      };
      const store = processSchema(schema);

      const orTerms = store.getObjects(
        DataFactory.namedNode(SUBJECT),
        DataFactory.namedNode(SHACL_OR),
        null
      );
      expect(orTerms).toHaveLength(1);
      expect(getListItems(store, orTerms[0])).toHaveLength(2);
    });

    it('should map oneOf with inline properties to sh:xone list of blank node shapes', () => {
      const schema: JsonSchemaObjectType = {
        $id: SUBJECT,
        oneOf: [
          { properties: { type: { const: 'undergraduate' } } },
          { properties: { type: { const: 'graduate' } } },
        ],
      };
      const store = processSchema(schema);

      const xoneTerms = store.getObjects(
        DataFactory.namedNode(SUBJECT),
        DataFactory.namedNode(SHACL_XONE),
        null
      );
      expect(xoneTerms).toHaveLength(1);
      expect(getListItems(store, xoneTerms[0])).toHaveLength(2);
    });
  });
});
