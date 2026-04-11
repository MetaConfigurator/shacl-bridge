import { DataFactory } from 'n3';
import { ContainsEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/contains-edge-processor';
import { ShaclMapper } from '../../../../src/shacl/tree-processor/mapper/shacl-mapper';
import {
  SHACL_DATATYPE,
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
  XSD_STRING,
} from '../../../../src/shacl/shacl-terms';
import { buildStore, EX, getBlankObject, getObject, makeEdge } from '../test-utils';

const SUBJECT = `${EX}ArrayShape`;

function buildContainsStore(
  toValue: Record<string, unknown>,
  parentSchema: Record<string, unknown> = {}
) {
  return buildStore(SUBJECT, (context) => {
    new ContainsEdgeProcessor(context, new ShaclMapper(context)).process(
      [makeEdge(toValue, 'contains')],
      SUBJECT,
      false,
      parentSchema
    );
  });
}

describe('ContainsEdgeProcessor', () => {
  it('should emit sh:qualifiedValueShape blank with mapped schema and default qualifiedMinCount of 1', () => {
    const store = buildContainsStore({ type: 'string' });

    const qvs = store.getObjects(
      DataFactory.namedNode(SUBJECT),
      DataFactory.namedNode(SHACL_QUALIFIED_VALUE_SHAPE),
      null
    );
    expect(qvs).toHaveLength(1);
    expect(qvs[0].termType).toBe('BlankNode');
    expect(getBlankObject(store, qvs[0], SHACL_DATATYPE)).toBe(XSD_STRING);
    expect(getObject(store, SUBJECT, SHACL_QUALIFIED_MIN_COUNT)).toBe('1');
    expect(getObject(store, SUBJECT, SHACL_QUALIFIED_MAX_COUNT)).toBeUndefined();
  });

  it('should use minContains from parent schema', () => {
    const store = buildContainsStore({ type: 'string' }, { minContains: 2 });

    expect(getObject(store, SUBJECT, SHACL_QUALIFIED_MIN_COUNT)).toBe('2');
  });

  it('should emit qualifiedMaxCount when maxContains is set', () => {
    const store = buildContainsStore({ type: 'string' }, { minContains: 1, maxContains: 3 });

    expect(getObject(store, SUBJECT, SHACL_QUALIFIED_MAX_COUNT)).toBe('3');
  });
});
