import { SchemaEdge } from '../../../tree/types';
import {
  SHACL_NODE,
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

  process({ edges, subject, isBlank, schema }: EdgeContext): ChildNode[] {
    if (subject == null) return [];
    if (schema == null || schema.length === 0) return [];
    const [edge] = edges;
    const qualifiedBlankId = this.context.nextBlankId();

    if (isBlank) {
      this.context.store.bothBlank(subject, SHACL_QUALIFIED_VALUE_SHAPE, qualifiedBlankId);
    } else {
      this.context.store.triple(subject, SHACL_QUALIFIED_VALUE_SHAPE, qualifiedBlankId, true);
    }

    const containsSchema = edge.node.schema;
    if (containsSchema.$ref) {
      this.context.store.blank(
        qualifiedBlankId,
        SHACL_NODE,
        this.context.resolveRef(containsSchema.$ref)
      );
    } else {
      this.shaclMapper.map(containsSchema, qualifiedBlankId, true);
    }

    const minContains = schema.minContains ?? 1;
    this.context.store.literalInt(
      subject,
      SHACL_QUALIFIED_MIN_COUNT,
      minContains,
      isBlank ?? false
    );

    if (schema.maxContains != null) {
      this.context.store.literalInt(
        subject,
        SHACL_QUALIFIED_MAX_COUNT,
        schema.maxContains,
        isBlank ?? false
      );
    }
    return [];
  }
}
