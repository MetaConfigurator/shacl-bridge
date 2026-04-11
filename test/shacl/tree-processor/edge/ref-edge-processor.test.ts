import { RefEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/ref-edge-processor';
import { SHACL_NODE } from '../../../../src/shacl/shacl-terms';
import { buildStore, EX, getObject, makeEdge } from '../test-utils';

const SUBJECT = `${EX}Root`;

function buildRefStore(refValue: string) {
  return buildStore(SUBJECT, (context) => {
    new RefEdgeProcessor(context).process([makeEdge(refValue, '$ref')], SUBJECT, false);
  });
}

describe('RefEdgeProcessor', () => {
  it('should map $ref to sh:node as named node', () => {
    const store = buildRefStore('#/$defs/Person');

    expect(getObject(store, SUBJECT, SHACL_NODE)).toBe(`${EX}Person`);
  });
});
