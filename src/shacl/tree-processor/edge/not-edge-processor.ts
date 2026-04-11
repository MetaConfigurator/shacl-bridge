import { Edge } from '../../../graph/types';
import { SHACL_NOT } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class NotEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly resolver: EdgeResolver
  ) {}

  process(edges: Edge[], subject: string, isBlank: boolean): void {
    for (const edge of edges) {
      const resolved = this.resolver.resolveEdgeToShapeId(edge);
      if (!resolved) continue;

      if (resolved.isRef) {
        this.context.store.linkNamed(subject, SHACL_NOT, resolved.id, isBlank);
      } else {
        this.context.store.linkBlank(subject, SHACL_NOT, resolved.id, isBlank);
      }
    }
  }
}
