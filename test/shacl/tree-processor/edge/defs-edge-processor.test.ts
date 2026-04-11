import { DefsEdgeProcessor } from '../../../../src/shacl/tree-processor/edge/defs-edge-processor';
import { WriterContext } from '../../../../src/shacl/writer/writer-context';
import { ProcessFn } from '../../../../src/shacl/tree-processor/edge/edge-processor';
import { EX, makeEdge, makeNode } from '../test-utils';

function makeDefsEdge(defName: string, toValue: Record<string, unknown>) {
  return { ...makeEdge(toValue, '$defs'), key: defName };
}

describe('DefsEdgeProcessor', () => {
  it('should call processFn for each $defs entry with defUri as subject and targetClass', () => {
    const context = new WriterContext({ $id: `${EX}Root` });
    const calls: { subject: string; targetClass: string | undefined }[] = [];
    const processFn: ProcessFn = (_node, subject, _isBlank, targetClass) => {
      calls.push({ subject, targetClass });
    };

    new DefsEdgeProcessor(context, processFn).process([
      makeDefsEdge('Name', { type: 'string' }),
      makeDefsEdge('Age', { type: 'integer' }),
    ]);

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ subject: `${EX}Name`, targetClass: `${EX}Name` });
    expect(calls[1]).toEqual({ subject: `${EX}Age`, targetClass: `${EX}Age` });
  });

  it('should not process the same def twice', () => {
    const context = new WriterContext({ $id: `${EX}Root` });
    const calls: string[] = [];
    const processFn: ProcessFn = (_node, subject) => {
      calls.push(subject);
    };

    new DefsEdgeProcessor(context, processFn).process([
      makeDefsEdge('Name', { type: 'string' }),
      makeDefsEdge('Name', { type: 'string' }),
    ]);

    expect(calls).toHaveLength(1);
  });

  it('should ignore edges without a propertyKey', () => {
    const context = new WriterContext({ $id: `${EX}Root` });
    const calls: string[] = [];
    const processFn: ProcessFn = (_node, subject) => {
      calls.push(subject);
    };

    new DefsEdgeProcessor(context, processFn).process([{ label: '$defs', node: makeNode({}) }]);

    expect(calls).toHaveLength(0);
  });
});
