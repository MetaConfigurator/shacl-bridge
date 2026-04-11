import { DataFactory } from 'n3';
import { NotEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/not-edge-processor';
import { EdgeResolver } from '../../../../src/shacl/tree-processor/edge/edge-resolver';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import { SHACL_NOT, SHACL_PATH, SHACL_PROPERTY } from '../../../../src/shacl/shacl-terms';
import { buildStore, EX, makeEdge, processSchema } from '../test-utils';

const SUBJECT = `${EX}Shape`;

function buildNotStore(notValue: JsonSchemaObjectType) {
  return buildStore(SUBJECT, (context) => {
    const resolver = new EdgeResolver(context, () => {
      /* empty */
    });
    new NotEdgeProcessor(context, resolver).process([makeEdge(notValue, 'not')], SUBJECT, false);
  });
}

describe('NotEdgeProcessor', () => {
  it('should map not with $ref to sh:not as named node', () => {
    const store = buildNotStore({ $ref: '#/$defs/Null' });

    const notTerms = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_NOT),
      null
    );
    expect(notTerms).toHaveLength(1);
    expect(notTerms[0].value).toBe(`${EX}Null`);
  });

  it('should map not with inline schema to sh:not blank node', () => {
    const schema: JsonSchemaObjectType = {
      $id: SUBJECT,
      not: { properties: { status: { const: 'expelled' } } },
    };

    const store = processSchema(schema);

    const notTerms = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_NOT),
      null
    );
    expect(notTerms).toHaveLength(1);
    expect(notTerms[0].termType).toBe('BlankNode');

    const propTerms = store.getObjects(notTerms[0], DataFactory.namedNode(SHACL_PROPERTY), null);
    expect(propTerms).toHaveLength(1);
    expect(store.getObjects(propTerms[0], DataFactory.namedNode(SHACL_PATH), null)[0]?.value).toBe(
      `${EX}status`
    );
  });
});
