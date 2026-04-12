import { SchemaEdge } from '../../../tree/types';
import { SHACL_NODE } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';

export class RefEdgeProcessor implements EdgeProcessor {
  constructor(private readonly context: WriterContext) {}

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.node.schema.$ref != null);
  }

  process({ edges, subject, isBlank }: EdgeContext): ChildNode[] {
    if (subject == null || isBlank == null) return [];
    const [edge] = edges;
    const ref = edge.node.schema.$ref;
    if (ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(ref), isBlank);
    }
    return [];
  }
}
