import { match, P } from 'ts-pattern';
import { Edge } from '../../../graph/types';
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

  resolveEdgeToShapeId(edge: Edge): { id: string; isRef: boolean } | null {
    return match(edge.to.value)
      .with(true, () => ({ id: this.context.nextBlankId(), isRef: false }))
      .with(false, () => {
        const blankId = this.context.nextBlankId();
        const notTargetBlankId = this.context.nextBlankId();
        this.context.store.bothBlank(blankId, SHACL_NOT, notTargetBlankId);
        return { id: blankId, isRef: false };
      })
      .with({ $ref: P.string }, (schema) => ({
        id: this.context.resolveRef(schema.$ref),
        isRef: true,
      }))
      .with(
        P.when((v): v is JsonSchemaObjectType => typeof v === 'object' && v !== null),
        (schema) => {
          const blankId = this.context.nextBlankId();
          if (this.hasMappableContent(schema)) {
            this.processFn(edge.to, blankId, true);
          }
          return { id: blankId, isRef: false };
        }
      )
      .otherwise(() => null);
  }

  hasMappableContent(schema: JsonSchemaObjectType): boolean {
    return Object.keys(schema).some((k) => !JSON_SCHEMA_UNHANDLED_KEYS.has(k));
  }
}
