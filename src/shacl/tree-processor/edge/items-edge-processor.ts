import { SchemaEdge } from '../../../tree/types';
import { SHACL_NODE } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';

export class ItemsEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === 'items');
  }

  process({ edges, subject }: EdgeContext): ChildNode[] {
    if (subject == null) return [];
    const [edge] = edges;
    const { schema } = edge.node;
    const isBlank = schema.$ref == null;
    if (schema.$ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), isBlank);
    } else {
      const blankId = this.context.nextBlankId();
      this.context.store.triple(subject, SHACL_NODE, blankId, isBlank);
      this.shaclMapper.map(schema, blankId, isBlank);
    }
    return [];
  }
}
