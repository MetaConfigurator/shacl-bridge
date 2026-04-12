import { DataFactory } from 'n3';
import { ItemsEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/items-edge-processor';
import { ShaclMapper } from '../../../../src/shacl/tree-processor/mapper/shacl-mapper';
import { SHACL_DATATYPE, SHACL_NODE, XSD_STRING } from '../../../../src/shacl/shacl-terms';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import { buildStore, EX, getBlankObject, getObject, makeEdge } from '../test-utils';

const SUBJECT = `${EX}ArrayShape`;

function buildItemsStore(toValue: JsonSchemaObjectType) {
  return buildStore(SUBJECT, (context) => {
    new ItemsEdgeProcessor(context, new ShaclMapper(context)).process({
      edges: [makeEdge(toValue, 'items')],
      subject: SUBJECT,
    });
  });
}

describe('ItemsEdgeProcessor', () => {
  it('should map items $ref to sh:node as named node', () => {
    const store = buildItemsStore({ $ref: '#/$defs/Item' });

    expect(getObject(store, SUBJECT, SHACL_NODE)).toBe(`${EX}Item`);
  });

  it('should map inline items schema to sh:node blank with mapped constraints', () => {
    const store = buildItemsStore({ type: 'string' });

    const nodeTerms = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_NODE),
      null
    );
    expect(nodeTerms).toHaveLength(1);
    expect(nodeTerms[0].termType).toBe('BlankNode');
    expect(getBlankObject(store, nodeTerms[0], SHACL_DATATYPE)).toBe(XSD_STRING);
  });
});
