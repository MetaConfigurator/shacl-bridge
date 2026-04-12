import { SchemaEdge } from '../../../tree/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import { SHACL_NOT } from '../../shacl-terms';
import { JSON_SCHEMA_UNHANDLED_KEYS } from '../../../json-schema/json-schema-terms';
import { WriterContext } from '../../writer/writer-context';
import { ChildNode } from './edge-processor';
import { match, P } from 'ts-pattern';

export interface ResolvedEdge {
  id: string;
  isRef: boolean;
  child?: ChildNode;
}

export class EdgeResolver {
  constructor(private readonly context: WriterContext) {}

  resolveEdgeToShapeId(edge: SchemaEdge): ResolvedEdge {
    return match(edge.node)
      .with({ booleanSchema: false }, () => {
        const blankId = this.context.nextBlankId();
        const notTargetBlankId = this.context.nextBlankId();
        this.context.store.bothBlank(blankId, SHACL_NOT, notTargetBlankId);
        return { id: blankId, isRef: false };
      })
      .with({ booleanSchema: true }, () => {
        return { id: this.context.nextBlankId(), isRef: false };
      })
      .with({ schema: { $ref: P.string } }, ({ schema }) => ({
        id: this.context.resolveRef(schema.$ref),
        isRef: true,
      }))
      .otherwise(({ schema }) => {
        const blankId = this.context.nextBlankId();
        const child: ChildNode | undefined = this.hasMappableContent(schema)
          ? { node: edge.node, subject: blankId, isBlank: true }
          : undefined;
        return { id: blankId, isRef: false, child };
      });
  }

  hasMappableContent(schema: JsonSchemaObjectType): boolean {
    return Object.keys(schema).some((k) => !JSON_SCHEMA_UNHANDLED_KEYS.has(k));
  }
}
