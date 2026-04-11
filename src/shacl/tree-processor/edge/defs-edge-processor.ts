import { Edge } from '../../../graph/types';
import { WriterContext } from '../../writer/writer-context';
import { ProcessFn } from './edge-processor';

export class DefsEdgeProcessor {
  private readonly processedDefs = new Set<string>();

  constructor(
    private readonly context: WriterContext,
    private readonly processFn: ProcessFn
  ) {}

  process(edges: Edge[]): void {
    const defsEdges = edges.filter((e) => e.label === '$defs');

    for (const edge of defsEdges) {
      const defName = edge.propertyKey;
      if (!defName || this.processedDefs.has(defName)) continue;

      this.processedDefs.add(defName);
      const defUri = this.context.buildDefUri(defName);
      this.processFn(edge.to, defUri, false, defUri);
    }
  }
}
