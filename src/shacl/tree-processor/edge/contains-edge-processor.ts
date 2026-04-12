import { SchemaEdge } from '../../../tree/types';
import {
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';

export class ContainsEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === 'contains');
  }

  process({ edges, subject, schema }: EdgeContext): ChildNode[] {
    if (subject == null) return [];
    if (schema == null || schema.length === 0) return [];
    const [edge] = edges;
    const blankId = this.context.nextBlankId();
    this.context.store.triple(subject, SHACL_QUALIFIED_VALUE_SHAPE, blankId, true);
    this.shaclMapper.map(edge.node.schema, blankId, true);

    const minContains = schema.minContains ?? 1;
    this.context.store.literalInt(subject, SHACL_QUALIFIED_MIN_COUNT, minContains, false);

    if (schema.maxContains != null) {
      this.context.store.literalInt(subject, SHACL_QUALIFIED_MAX_COUNT, schema.maxContains, false);
    }
    return [];
  }
}
