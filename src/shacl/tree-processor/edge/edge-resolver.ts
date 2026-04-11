import { SchemaEdge } from '../../../tree/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import { SHACL_NOT } from '../../shacl-terms';
import { JSON_SCHEMA_UNHANDLED_KEYS } from '../../../json-schema/json-schema-terms';
import { WriterContext } from '../../writer/writer-context';
import { ProcessFn } from './edge-processor';

export class EdgeResolver {
  constructor(
    private readonly context: WriterContext,
    private readonly processFn: ProcessFn
  ) {}

  resolveEdgeToShapeId(edge: SchemaEdge): { id: string; isRef: boolean } | null {
    if (edge.node.booleanSchema === false) {
      const blankId = this.context.nextBlankId();
      const notTargetBlankId = this.context.nextBlankId();
      this.context.store.bothBlank(blankId, SHACL_NOT, notTargetBlankId);
      return { id: blankId, isRef: false };
    }
    if (edge.node.booleanSchema === true) {
      return { id: this.context.nextBlankId(), isRef: false };
    }
    const schema = edge.node.schema;
    if (schema.$ref) {
      return { id: this.context.resolveRef(schema.$ref), isRef: true };
    }
    if (this.hasMappableContent(schema)) {
      const blankId = this.context.nextBlankId();
      this.processFn(edge.node, blankId, true);
      return { id: blankId, isRef: false };
    }
    return null;
  }

  hasMappableContent(schema: JsonSchemaObjectType): boolean {
    return Object.keys(schema).some((k) => !JSON_SCHEMA_UNHANDLED_KEYS.has(k));
  }
}
