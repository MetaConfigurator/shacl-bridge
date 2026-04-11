import { Edge } from '../../../graph/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import {
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { EdgeProcessor } from './edge-processor';

export class ContainsEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  process(edges: Edge[], subject: string, isBlank: boolean): void {
    const edge = edges[0];
    const schema = edge.to.value as JsonSchemaObjectType;
    const parentSchema = edge.from.value as JsonSchemaObjectType;
    const blankId = this.context.nextBlankId();

    this.context.store.linkBlank(subject, SHACL_QUALIFIED_VALUE_SHAPE, blankId, isBlank);
    this.shaclMapper.map(schema, blankId, true);

    const minContains = parentSchema.minContains ?? 1;
    this.context.store.literalInt(subject, SHACL_QUALIFIED_MIN_COUNT, minContains, isBlank);

    if (parentSchema.maxContains != null) {
      this.context.store.literalInt(
        subject,
        SHACL_QUALIFIED_MAX_COUNT,
        parentSchema.maxContains,
        isBlank
      );
    }
  }
}
