import { DefsEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/defs-edge-processor';
import { WriterContext } from '../../../../src/shacl/writer/writer-context';
import { EX, makeEdge, makeNode } from '../test-utils';

function makeDefsEdge(defName: string, toValue: Record<string, unknown>) {
  return { ...makeEdge(toValue, '$defs'), key: defName };
}

describe('DefsEdgeProcessor', () => {
  it('should return a ChildNode for each $defs entry with defUri as subject and targetClass', () => {
    const context = new WriterContext({ $id: `${EX}Root` });

    const children = new DefsEdgeProcessor(context).process({
      edges: [makeDefsEdge('Name', { type: 'string' }), makeDefsEdge('Age', { type: 'integer' })],
    });

    expect(children).toHaveLength(2);
    expect(children[0]).toMatchObject({ subject: `${EX}Name`, targetClass: `${EX}Name` });
    expect(children[1]).toMatchObject({ subject: `${EX}Age`, targetClass: `${EX}Age` });
  });

  it('should not process the same def twice', () => {
    const context = new WriterContext({ $id: `${EX}Root` });

    const children = new DefsEdgeProcessor(context).process({
      edges: [makeDefsEdge('Name', { type: 'string' }), makeDefsEdge('Name', { type: 'string' })],
    });

    expect(children).toHaveLength(1);
  });

  it('should ignore edges without a key', () => {
    const context = new WriterContext({ $id: `${EX}Root` });

    const children = new DefsEdgeProcessor(context).process({
      edges: [{ label: '$defs', node: makeNode({}) }],
    });

    expect(children).toHaveLength(0);
  });
});
