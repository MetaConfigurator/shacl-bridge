import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import {
  SHACL_CLOSED,
  SHACL_DEACTIVATED,
  SHACL_DEFAULT_VALUE,
  SHACL_DESCRIPTION,
  SHACL_HAS_VALUE,
  SHACL_IN,
  SHACL_MAX_COUNT,
  SHACL_MAX_EXCLUSIVE,
  SHACL_MAX_INCLUSIVE,
  SHACL_MAX_LENGTH,
  SHACL_MIN_COUNT,
  SHACL_MIN_EXCLUSIVE,
  SHACL_MIN_INCLUSIVE,
  SHACL_MIN_LENGTH,
  SHACL_NAME,
  SHACL_PATTERN,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { match } from 'ts-pattern';

type ConstraintMapping =
  | { type: 'int'; predicate: string }
  | { type: 'number'; predicate: string }
  | { type: 'string'; predicate: string }
  | { type: 'bool'; predicate: string }
  | { type: 'flag'; predicate: string; when?: boolean }
  | { type: 'array'; predicate: string }
  | { type: 'value'; predicate: string };

const CONSTRAINT_MAPPINGS: Record<string, ConstraintMapping> = {
  minLength: { type: 'int', predicate: SHACL_MIN_LENGTH },
  maxLength: { type: 'int', predicate: SHACL_MAX_LENGTH },
  minItems: { type: 'int', predicate: SHACL_MIN_COUNT },
  maxItems: { type: 'int', predicate: SHACL_MAX_COUNT },
  minimum: { type: 'number', predicate: SHACL_MIN_INCLUSIVE },
  maximum: { type: 'number', predicate: SHACL_MAX_INCLUSIVE },
  exclusiveMinimum: { type: 'number', predicate: SHACL_MIN_EXCLUSIVE },
  exclusiveMaximum: { type: 'number', predicate: SHACL_MAX_EXCLUSIVE },
  title: { type: 'string', predicate: SHACL_NAME },
  description: { type: 'string', predicate: SHACL_DESCRIPTION },
  pattern: { type: 'string', predicate: SHACL_PATTERN },
  deprecated: { type: 'flag', predicate: SHACL_DEACTIVATED, when: true },
  additionalProperties: { type: 'flag', predicate: SHACL_CLOSED, when: false },
  unevaluatedProperties: { type: 'flag', predicate: SHACL_CLOSED, when: false },
  enum: { type: 'array', predicate: SHACL_IN },
  const: { type: 'value', predicate: SHACL_HAS_VALUE },
  default: { type: 'value', predicate: SHACL_DEFAULT_VALUE },
};

export class ConstraintMapper {
  constructor(private readonly context: WriterContext) {}

  map(schema: JsonSchemaObjectType, subject: string, isBlank = false): void {
    const s = this.context.store;

    for (const [key, mapping] of Object.entries(CONSTRAINT_MAPPINGS)) {
      const v = schema[key as keyof JsonSchemaObjectType];
      if (v == null) continue;
      match(mapping)
        .with({ type: 'int' }, ({ predicate }) =>
          s.literalInt(subject, predicate, v as number, isBlank)
        )
        .with({ type: 'number' }, ({ predicate }) =>
          s.literalNumber(subject, predicate, v as number, isBlank)
        )
        .with({ type: 'string' }, ({ predicate }) =>
          s.literalString(subject, predicate, v as string, isBlank)
        )
        .with({ type: 'bool' }, ({ predicate }) =>
          s.literalBool(subject, predicate, v as boolean, isBlank)
        )
        .with({ type: 'flag' }, ({ predicate, when = true }) =>
          v === when ? s.literalBool(subject, predicate, true, isBlank) : undefined
        )
        .with({ type: 'array' }, ({ predicate }) =>
          Array.isArray(v) ? s.listOfValues(subject, predicate, v, isBlank) : undefined
        )
        .with({ type: 'value' }, ({ predicate }) => s.literalValue(subject, predicate, v, isBlank))
        .exhaustive();
    }
  }
}
