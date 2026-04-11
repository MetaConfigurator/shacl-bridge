import { Edge } from '../../../graph/types';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class LogicalEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly resolver: EdgeResolver,
    private readonly predicate: string
  ) {}

  process(edges: Edge[], subject: string, isBlank: boolean): void {
    const resolved = edges
      .map((e) => this.resolver.resolveEdgeToShapeId(e))
      .filter((r): r is { id: string; isRef: boolean } => r !== null);

    if (resolved.length === 0) return;

    const ids = resolved.map((r) => r.id);
    if (resolved.every((r) => r.isRef)) {
      this.context.store.list(subject, this.predicate, ids, isBlank, true);
    } else {
      this.context.store.listOfBlanks(subject, this.predicate, ids, isBlank);
    }
  }
}
