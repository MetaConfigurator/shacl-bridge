import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import {
  SHACL_BLANK_NODE_OR_IRI,
  SHACL_DATATYPE,
  SHACL_LITERAL,
  SHACL_NODE_KIND,
  SHACL_OR,
  XSD_BOOLEAN,
  XSD_DECIMAL,
  XSD_INTEGER,
  XSD_STRING,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';

export interface TypeMappingEntry {
  predicate: string;
  value: string;
}

type TypeMapping = Partial<Record<string, TypeMappingEntry>>;

const TYPE_MAPPINGS: TypeMapping = {
  null: { predicate: SHACL_NODE_KIND, value: SHACL_LITERAL },
  object: { predicate: SHACL_NODE_KIND, value: SHACL_BLANK_NODE_OR_IRI },
  string: { predicate: SHACL_DATATYPE, value: XSD_STRING },
  integer: { predicate: SHACL_DATATYPE, value: XSD_INTEGER },
  number: { predicate: SHACL_DATATYPE, value: XSD_DECIMAL },
  boolean: { predicate: SHACL_DATATYPE, value: XSD_BOOLEAN },
};

export class TypeMapper {
  constructor(private readonly context: WriterContext) {}

  map(
    schema: JsonSchemaObjectType,
    subject: string,
    isBlank: boolean,
    formatOverrides: Set<string>
  ): void {
    if (Array.isArray(schema.type)) {
      this.mapUnionType(schema.type as string[], subject, isBlank);
      return;
    }
    if (typeof schema.type !== 'string') return;
    if (schema.format != null && formatOverrides.has(schema.format)) return;

    const mapping = TYPE_MAPPINGS[schema.type];
    if (mapping == null) return;

    if (isBlank) {
      this.context.store.blank(subject, mapping.predicate, mapping.value);
    } else {
      this.context.store.triple(subject, mapping.predicate, mapping.value, false);
    }
  }

  private mapUnionType(types: string[], subject: string, isBlank: boolean): void {
    const blankIds = types
      .map((type) => TYPE_MAPPINGS[type])
      .filter((m): m is TypeMappingEntry => m != null)
      .map(({ predicate, value }) => {
        const blankId = this.context.nextBlankId();
        this.context.store.blank(blankId, predicate, value);
        return blankId;
      });
    this.context.store.listOfBlanks(subject, SHACL_OR, blankIds, isBlank);
  }
}
