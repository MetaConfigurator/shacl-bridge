import { Edge } from '../../../graph/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import { SHACL_NODE } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { EdgeProcessor } from './edge-processor';

export class ItemsEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  process(edges: Edge[], subject: string, isBlank: boolean): void {
    const edge = edges[0];
    const schema = edge.to.value as JsonSchemaObjectType;
    if (schema.$ref) {
      this.context.store.linkNamed(
        subject,
        SHACL_NODE,
        this.context.resolveRef(schema.$ref),
        isBlank
      );
    } else {
      const blankId = this.context.nextBlankId();
      this.context.store.linkBlank(subject, SHACL_NODE, blankId, isBlank);
      this.shaclMapper.map(schema, blankId, true);
    }
  }
}
