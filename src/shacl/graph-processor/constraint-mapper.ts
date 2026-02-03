import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import {
  SHACL_BLANK_NODE_OR_IRI,
  SHACL_CLOSED,
  SHACL_DATATYPE,
  SHACL_DESCRIPTION,
  SHACL_HAS_VALUE,
  SHACL_IN,
  SHACL_IRI,
  SHACL_MAX_COUNT,
  SHACL_MAX_EXCLUSIVE,
  SHACL_MAX_INCLUSIVE,
  SHACL_MAX_LENGTH,
  SHACL_MIN_COUNT,
  SHACL_MIN_EXCLUSIVE,
  SHACL_MIN_INCLUSIVE,
  SHACL_MIN_LENGTH,
  SHACL_NAME,
  SHACL_NODE_KIND,
  SHACL_PATTERN,
  XSD_BOOLEAN,
  XSD_DATE,
  XSD_DATE_TIME,
  XSD_DECIMAL,
  XSD_INTEGER,
  XSD_STRING,
  XSD_TIME,
} from '../../util/rdf-terms';
import { WriterContext } from '../writer/writer-context';

type TypeMapping = Record<string, { predicate: string; value: string }>;

const TYPE_MAPPINGS: TypeMapping = {
  object: { predicate: SHACL_NODE_KIND, value: SHACL_BLANK_NODE_OR_IRI },
  string: { predicate: SHACL_DATATYPE, value: XSD_STRING },
  integer: { predicate: SHACL_DATATYPE, value: XSD_INTEGER },
  number: { predicate: SHACL_DATATYPE, value: XSD_DECIMAL },
  boolean: { predicate: SHACL_DATATYPE, value: XSD_BOOLEAN },
};

type FormatMapping =
  | { type: 'datatype'; value: string }
  | { type: 'nodeKind'; value: string }
  | { type: 'pattern'; value: string };

const FORMAT_MAPPINGS: Record<string, FormatMapping> = {
  'date-time': { type: 'datatype', value: XSD_DATE_TIME },
  date: { type: 'datatype', value: XSD_DATE },
  time: { type: 'datatype', value: XSD_TIME },
  uri: { type: 'nodeKind', value: SHACL_IRI },
  iri: { type: 'nodeKind', value: SHACL_IRI },
  email: {
    type: 'pattern',
    value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  },
  uuid: {
    type: 'pattern',
    value: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  },
};

export class ConstraintMapper {
  constructor(private readonly context: WriterContext) {}

  map(schema: JsonSchemaObjectType, subject: string, isBlank = false): void {
    this.mapMetadata(schema, subject, isBlank);
    this.mapType(schema, subject, isBlank);
    this.mapFormatConstraints(schema, subject, isBlank);
    this.mapStringConstraints(schema, subject, isBlank);
    this.mapNumericConstraints(schema, subject, isBlank);
    this.mapCardinalityConstraints(schema, subject, isBlank);
    this.mapValueConstraints(schema, subject, isBlank);
    this.mapClosedConstraint(schema, subject, isBlank);
  }

  private mapMetadata(schema: JsonSchemaObjectType, subject: string, isBlank: boolean): void {
    if (schema.title) {
      this.context.store.literalString(subject, SHACL_NAME, schema.title, isBlank);
    }
    if (schema.description) {
      this.context.store.literalString(subject, SHACL_DESCRIPTION, schema.description, isBlank);
    }
  }

  private mapType(schema: JsonSchemaObjectType, subject: string, isBlank: boolean): void {
    if (typeof schema.type !== 'string') return;
    if (schema.format && FORMAT_MAPPINGS[schema.format]) return;

    const mapping = TYPE_MAPPINGS[schema.type];
    if (mapping) {
      if (isBlank) {
        this.context.store.blank(subject, mapping.predicate, mapping.value);
      } else {
        this.context.store.triple(subject, mapping.predicate, mapping.value, false);
      }
    }
  }

  private mapFormatConstraints(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean
  ): void {
    if (!schema.format) return;

    const mapping = FORMAT_MAPPINGS[schema.format];
    if (!mapping) return;
    // TODO : ts-pattern
    switch (mapping.type) {
      case 'datatype':
        if (isBlank) {
          this.context.store.blank(subject, SHACL_DATATYPE, mapping.value);
        } else {
          this.context.store.triple(subject, SHACL_DATATYPE, mapping.value, false);
        }
        break;
      case 'nodeKind':
        if (isBlank) {
          this.context.store.blank(subject, SHACL_NODE_KIND, mapping.value);
        } else {
          this.context.store.triple(subject, SHACL_NODE_KIND, mapping.value, false);
        }
        break;
      case 'pattern':
        this.context.store.literalString(subject, SHACL_PATTERN, mapping.value, isBlank);
        break;
    }
  }

  private mapStringConstraints(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean
  ): void {
    if (schema.minLength !== undefined) {
      this.context.store.literalInt(subject, SHACL_MIN_LENGTH, schema.minLength, isBlank);
    }
    if (schema.maxLength !== undefined) {
      this.context.store.literalInt(subject, SHACL_MAX_LENGTH, schema.maxLength, isBlank);
    }
    if (schema.pattern !== undefined) {
      this.context.store.literalString(subject, SHACL_PATTERN, schema.pattern, isBlank);
    }
  }

  private mapNumericConstraints(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean
  ): void {
    if (schema.minimum !== undefined) {
      this.context.store.literalInt(subject, SHACL_MIN_INCLUSIVE, schema.minimum, isBlank);
    }
    if (schema.maximum !== undefined) {
      this.context.store.literalInt(subject, SHACL_MAX_INCLUSIVE, schema.maximum, isBlank);
    }
    if (schema.exclusiveMinimum !== undefined) {
      this.context.store.literalInt(subject, SHACL_MIN_EXCLUSIVE, schema.exclusiveMinimum, isBlank);
    }
    if (schema.exclusiveMaximum !== undefined) {
      this.context.store.literalInt(subject, SHACL_MAX_EXCLUSIVE, schema.exclusiveMaximum, isBlank);
    }
  }

  private mapCardinalityConstraints(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean
  ): void {
    if (schema.minItems !== undefined) {
      this.context.store.literalInt(subject, SHACL_MIN_COUNT, schema.minItems, isBlank);
    }
    if (schema.maxItems !== undefined) {
      this.context.store.literalInt(subject, SHACL_MAX_COUNT, schema.maxItems, isBlank);
    }
  }

  private mapValueConstraints(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean
  ): void {
    if (schema.const !== undefined && schema.const !== null) {
      this.context.store.literalString(subject, SHACL_HAS_VALUE, String(schema.const), isBlank);
    }
    if (Array.isArray(schema.enum)) {
      this.context.store.list(subject, SHACL_IN, schema.enum.map(String), isBlank);
    }
  }

  private mapClosedConstraint(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean
  ): void {
    if (schema.additionalProperties === false || schema.unevaluatedProperties === false) {
      this.context.store.literalBool(subject, SHACL_CLOSED, true, isBlank);
    }
  }
}
