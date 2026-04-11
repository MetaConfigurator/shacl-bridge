import { SchemaEdge } from '../../../tree/types';
import { SHACL_NODE } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { EdgeProcessor } from './edge-processor';

export class ItemsEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  process([edge]: SchemaEdge[], subject: string, isBlank: boolean): void {
    const { schema } = edge.node;
    isBlank = schema.$ref == null;
    if (schema.$ref) {
      this.context.store.triple(subject, SHACL_NODE, this.context.resolveRef(schema.$ref), isBlank);
    } else {
      const blankId = this.context.nextBlankId();
      this.context.store.triple(subject, SHACL_NODE, blankId, isBlank);
      this.shaclMapper.map(schema, blankId, isBlank);
    }
  }
}
