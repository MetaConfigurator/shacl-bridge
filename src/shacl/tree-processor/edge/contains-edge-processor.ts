import { SchemaEdge } from '../../../tree/types';
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

  process(
    [edge]: SchemaEdge[],
    subject: string,
    _isBlank: boolean,
    parentSchema?: JsonSchemaObjectType
  ): void {
    const blankId = this.context.nextBlankId();
    this.context.store.triple(subject, SHACL_QUALIFIED_VALUE_SHAPE, blankId, true);
    this.shaclMapper.map(edge.node.schema, blankId, true);

    const minContains = parentSchema?.minContains ?? 1;
    this.context.store.literalInt(subject, SHACL_QUALIFIED_MIN_COUNT, minContains, false);

    if (parentSchema?.maxContains !== undefined) {
      this.context.store.literalInt(
        subject,
        SHACL_QUALIFIED_MAX_COUNT,
        parentSchema.maxContains,
        false
      );
    }
  }
}
