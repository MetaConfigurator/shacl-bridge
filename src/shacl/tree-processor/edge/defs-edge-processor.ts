import { SchemaEdge } from '../../../tree/types';
import { WriterContext } from '../../writer/writer-context';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';

export class DefsEdgeProcessor implements EdgeProcessor {
  private readonly processedDefs = new Set<string>();

  constructor(private readonly context: WriterContext) {}

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === '$defs');
  }

  process({ edges }: EdgeContext): ChildNode[] {
    const children: ChildNode[] = [];
    for (const edge of edges) {
      if (!edge.key || this.processedDefs.has(edge.key)) continue;
      this.processedDefs.add(edge.key);
      const defUri = this.context.buildDefUri(edge.key);
      children.push({ node: edge.node, subject: defUri, isBlank: false, targetClass: defUri });
    }
    return children;
  }
}
