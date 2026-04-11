import { Edge } from '../../../graph/types';
import { SHACL_NODE } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';

export class RefEdgeProcessor implements EdgeProcessor {
  constructor(private readonly context: WriterContext) {}

  process(edges: Edge[], subject: string, isBlank: boolean): void {
    const edge = edges[0];
    const refValue = edge.to.value;
    if (typeof refValue === 'string') {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(refValue), isBlank);
    }
  }
}
