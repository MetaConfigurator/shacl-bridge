import { SchemaEdge } from '../../../tree/types';
import { SHACL_NOT } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class NotEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly resolver: EdgeResolver
  ) {}

  process([edge]: SchemaEdge[], subject: string, isBlank: boolean): void {
    const resolved = this.resolver.resolveEdgeToShapeId(edge);
    if (!resolved) return;

    if (isBlank) {
      if (resolved.isRef) this.context.store.blank(subject, SHACL_NOT, resolved.id);
      else this.context.store.bothBlank(subject, SHACL_NOT, resolved.id);
    } else {
      this.context.store.triple(subject, SHACL_NOT, resolved.id, !resolved.isRef);
    }
  }
}
