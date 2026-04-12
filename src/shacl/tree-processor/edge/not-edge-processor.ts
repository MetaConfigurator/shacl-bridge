import { SchemaEdge } from '../../../tree/types';
import { SHACL_NOT } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class NotEdgeProcessor implements EdgeProcessor {
  private readonly resolver: EdgeResolver;

  constructor(private readonly context: WriterContext) {
    this.resolver = new EdgeResolver(context);
  }

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === 'not');
  }

  process({ edges, subject, isBlank }: EdgeContext): ChildNode[] {
    if (subject == null) return [];
    const [edge] = edges;
    const resolved = this.resolver.resolveEdgeToShapeId(edge);
    if (isBlank) {
      if (resolved.isRef) this.context.store.blank(subject, SHACL_NOT, resolved.id);
      else this.context.store.bothBlank(subject, SHACL_NOT, resolved.id);
    } else {
      this.context.store.triple(subject, SHACL_NOT, resolved.id, !resolved.isRef);
    }

    return resolved.child ? [resolved.child] : [];
  }
}
