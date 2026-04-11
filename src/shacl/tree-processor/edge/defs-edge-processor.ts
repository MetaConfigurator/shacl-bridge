import { SchemaEdge } from '../../../tree/types';
import { WriterContext } from '../../writer/writer-context';
import { ProcessFn } from './edge-processor';

export class DefsEdgeProcessor {
  private readonly processedDefs = new Set<string>();

  constructor(
    private readonly context: WriterContext,
    private readonly processFn: ProcessFn
  ) {}

  process(edges: SchemaEdge[]): void {
    for (const edge of edges) {
      const defName = edge.key;
      if (!defName || this.processedDefs.has(defName)) continue;

      this.processedDefs.add(defName);
      const defUri = this.context.buildDefUri(defName);
      this.processFn(edge.node, defUri, false, defUri);
    }
  }
}
