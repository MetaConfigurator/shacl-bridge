import { SchemaEdge } from '../../../tree/types';
import { SHACL_NODE } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';

export class RefEdgeProcessor implements EdgeProcessor {
  constructor(private readonly context: WriterContext) {}

  process([edge]: SchemaEdge[], subject: string, isBlank: boolean): void {
    const ref = edge.node.schema.$ref;
    if (ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(ref), isBlank);
    }
  }
}
