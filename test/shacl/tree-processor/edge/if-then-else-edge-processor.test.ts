import { DataFactory } from 'n3';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import {
  SHACL_AND,
  SHACL_HAS_VALUE,
  SHACL_MIN_COUNT,
  SHACL_NOT,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
} from '../../../../src/shacl/shacl-terms';
import { EX, getBlankObject, getListItems, processSchema } from '../test-utils';

const SUBJECT = `${EX}Shape`;

describe('IfThenElseEdgeProcessor', () => {
  it('should map if/then to sh:or( [sh:not if] then )', () => {
    const schema: JsonSchemaObjectType = {
      $id: SUBJECT,
      if: { properties: { type: { const: 'graduate' } } },
      then: { properties: { advisor: { type: 'string' } }, required: ['advisor'] },
    };
    const store = processSchema(schema);

    const orTerms = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_OR),
      null
    );
    expect(orTerms).toHaveLength(1);
    const items = getListItems(store, orTerms[0]);
    expect(items).toHaveLength(2);

    const notTarget = store.getObjects(
      DataFactory.blankNode(items[0]),
      DataFactory.namedNode(SHACL_NOT),
      null
    )[0];
    expect(notTarget).toBeDefined();
    const notProps = store.getObjects(notTarget, DataFactory.namedNode(SHACL_PROPERTY), null);
    expect(notProps).toHaveLength(1);
    expect(getBlankObject(store, notProps[0], SHACL_HAS_VALUE)).toBe('graduate');

    const thenProps = store.getObjects(
      DataFactory.blankNode(items[1]),
      DataFactory.namedNode(SHACL_PROPERTY),
      null
    );
    expect(thenProps).toHaveLength(1);
    expect(getBlankObject(store, thenProps[0], SHACL_PATH)).toBe(`${EX}advisor`);
    expect(getBlankObject(store, thenProps[0], SHACL_MIN_COUNT)).toBe('1');
  });

  it('should map if/else to sh:or( if else )', () => {
    const schema: JsonSchemaObjectType = {
      $id: SUBJECT,
      if: { properties: { type: { const: 'graduate' } } },
      else: { properties: { grade: { type: 'string' } }, required: ['grade'] },
    };
    const store = processSchema(schema);

    const orTerms = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_OR),
      null
    );
    expect(orTerms).toHaveLength(1);
    const items = getListItems(store, orTerms[0]);
    expect(items).toHaveLength(2);

    const ifProps = store.getObjects(
      DataFactory.blankNode(items[0]),
      DataFactory.namedNode(SHACL_PROPERTY),
      null
    );
    expect(getBlankObject(store, ifProps[0], SHACL_HAS_VALUE)).toBe('graduate');

    const elseProps = store.getObjects(
      DataFactory.blankNode(items[1]),
      DataFactory.namedNode(SHACL_PROPERTY),
      null
    );
    expect(getBlankObject(store, elseProps[0], SHACL_PATH)).toBe(`${EX}grade`);
    expect(getBlankObject(store, elseProps[0], SHACL_MIN_COUNT)).toBe('1');
  });

  it('should map if/then/else to sh:and( [sh:or([sh:not if] then)] [sh:or(if else)] )', () => {
    const schema: JsonSchemaObjectType = {
      $id: SUBJECT,
      if: { properties: { type: { const: 'graduate' } } },
      then: { properties: { advisor: { type: 'string' } }, required: ['advisor'] },
      else: { properties: { grade: { type: 'string' } }, required: ['grade'] },
    };
    const store = processSchema(schema);

    const andTerms = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_AND),
      null
    );
    expect(andTerms).toHaveLength(1);
    const andItems = getListItems(store, andTerms[0]);
    expect(andItems).toHaveLength(2);

    const firstOr = store.getObjects(
      DataFactory.blankNode(andItems[0]),
      DataFactory.namedNode(SHACL_OR),
      null
    )[0];
    expect(getListItems(store, firstOr)).toHaveLength(2);
    expect(
      store.getObjects(
        DataFactory.blankNode(getListItems(store, firstOr)[0]),
        DataFactory.namedNode(SHACL_NOT),
        null
      )
    ).toHaveLength(1);

    const secondOr = store.getObjects(
      DataFactory.blankNode(andItems[1]),
      DataFactory.namedNode(SHACL_OR),
      null
    )[0];
    const secondOrItems = getListItems(store, secondOr);
    expect(secondOrItems).toHaveLength(2);
    const ifProps = store.getObjects(
      DataFactory.blankNode(secondOrItems[0]),
      DataFactory.namedNode(SHACL_PROPERTY),
      null
    );
    expect(getBlankObject(store, ifProps[0], SHACL_HAS_VALUE)).toBe('graduate');
  });

  it('should not emit anything for if without then or else', () => {
    const schema: JsonSchemaObjectType = {
      $id: SUBJECT,
      if: { properties: { type: { const: 'graduate' } } },
    };
    const store = processSchema(schema);

    expect(
      store.getObjects(DataFactory.namedNode(SUBJECT), DataFactory.namedNode(SHACL_OR), null)
    ).toHaveLength(0);
    expect(
      store.getObjects(DataFactory.namedNode(SUBJECT), DataFactory.namedNode(SHACL_AND), null)
    ).toHaveLength(0);
  });
});
