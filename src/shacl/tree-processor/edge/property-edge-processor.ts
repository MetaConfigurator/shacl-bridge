import { match, P } from 'ts-pattern';
import { Edge } from '../../../graph/types';
import { JsonSchemaObjectType, JsonSchemaType } from '../../../json-schema/meta/json-schema-type';
import {
  SHACL_AND,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_NODE,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_XONE,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';
import { ProcessFn } from './edge-processor';

const LOGICAL_OPERATOR_MAP: Record<string, string> = {
  allOf: SHACL_AND,
  anyOf: SHACL_OR,
  oneOf: SHACL_XONE,
};

export class PropertyEdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper,
    private readonly processFn: ProcessFn
  ) {}

  process(edges: Edge[], required: Set<string>, subject: string, isBlank: boolean): void {
    const processedProperties = new Set<string>();

    for (const edge of edges) {
      if (edge.propertyKey) processedProperties.add(edge.propertyKey);
      this.processPropertyEdge(edge, subject, required, isBlank);
    }

    for (const req of required) {
      if (!processedProperties.has(req)) {
        const blankId = this.context.nextBlankId();
        this.context.store.linkBlank(subject, SHACL_PROPERTY, blankId, isBlank);
        this.context.store.blank(blankId, SHACL_PATH, this.context.buildPropertyUri(req));
        this.context.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
        this.context.store.literalInt(blankId, SHACL_MAX_COUNT, 1, true);
      }
    }
  }

  private processPropertyEdge(
    edge: Edge,
    subject: string,
    required: Set<string>,
    isBlank: boolean
  ): void {
    const propName = edge.propertyKey;
    if (!propName) return;

    const blankId = this.context.nextBlankId();
    this.context.store.linkBlank(subject, SHACL_PROPERTY, blankId, isBlank);
    this.context.store.blank(blankId, SHACL_PATH, this.context.buildPropertyUri(propName));

    if (required.has(propName)) {
      this.context.store.literalInt(blankId, SHACL_MIN_COUNT, 1, true);
    }

    const rawValue = edge.to.value;

    if (rawValue === false) {
      this.context.store.literalInt(blankId, SHACL_MAX_COUNT, 0, true);
      return;
    }

    const propSchema = rawValue as JsonSchemaObjectType;

    if (propSchema.type !== 'array') {
      this.context.store.literalInt(blankId, SHACL_MAX_COUNT, 1, true);
    }

    this.processPropertySchema(blankId, propSchema, edge);
  }

  private processPropertySchema(blankId: string, schema: JsonSchemaObjectType, edge: Edge): void {
    match(schema)
      .with({ $ref: P.string }, (s) => {
        this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(s.$ref));
      })
      .with({ type: 'object', properties: P.not(P.nullish) }, () => {
        const nestedBlankId = this.context.nextBlankId();
        this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
        this.processFn(edge.to, nestedBlankId, true);
      })
      .with({ type: 'array', items: P.not(P.nullish) }, (s) => {
        this.shaclMapper.map(s, blankId, true);
        match(s.items as JsonSchemaObjectType)
          .with({ $ref: P.string }, (items) => {
            this.context.store.blank(blankId, SHACL_NODE, this.context.resolveRef(items.$ref));
          })
          .otherwise((items) => {
            const nestedBlankId = this.context.nextBlankId();
            this.context.store.bothBlank(blankId, SHACL_NODE, nestedBlankId);
            this.shaclMapper.map(items, nestedBlankId, true);
          });
      })
      .otherwise((s) => {
        for (const [key, predicate] of Object.entries(LOGICAL_OPERATOR_MAP)) {
          const items = (s as Record<string, unknown>)[key];
          if (Array.isArray(items)) {
            this.processPropertyLogicalOperator(blankId, items as JsonSchemaType[], predicate);
            return;
          }
        }
        this.shaclMapper.map(s, blankId, true);
      });
  }

  private processPropertyLogicalOperator(
    blankId: string,
    schemas: JsonSchemaType[],
    predicate: string
  ): void {
    const refs = schemas.flatMap((s) =>
      typeof s === 'object' && s.$ref ? [this.context.resolveRef(s.$ref)] : []
    );
    if (refs.length > 0) {
      this.context.store.list(blankId, predicate, refs, true, true);
    }
  }
}
