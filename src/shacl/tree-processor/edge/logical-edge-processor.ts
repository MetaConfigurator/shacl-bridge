import { SchemaEdge } from '../../../tree/types';
import { WriterContext } from '../../writer/writer-context';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class LogicalEdgeProcessor implements EdgeProcessor {
  private readonly resolver: EdgeResolver;

  constructor(
    private readonly context: WriterContext,
    private readonly label: string,
    private readonly predicate: string
  ) {
    this.resolver = new EdgeResolver(context);
  }

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === this.label);
  }

  process({ edges, subject, isBlank }: EdgeContext): ChildNode[] {
    if (subject == null) return [];
    const resolved = edges.map((e) => this.resolver.resolveEdgeToShapeId(e));

    if (resolved.length === 0) return [];

    const ids = resolved.map((r) => r.id);
    if (resolved.every((r) => r.isRef)) {
      this.context.store.list(subject, this.predicate, ids, isBlank, true);
    } else {
      this.context.store.listOfBlanks(subject, this.predicate, ids, isBlank);
    }

    return resolved.flatMap((r) => (r.child ? [r.child] : []));
  }
}
