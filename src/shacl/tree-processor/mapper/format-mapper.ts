import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import {
  SHACL_DATATYPE,
  SHACL_IRI,
  SHACL_NODE_KIND,
  SHACL_PATTERN,
  XSD_DATE,
  XSD_DATE_TIME,
  XSD_TIME,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { match, P } from 'ts-pattern';

type FormatMapping =
  | { type: 'datatype'; value: string }
  | { type: 'nodeKind'; value: string }
  | { type: 'pattern'; value: string };

const FORMAT_MAPPINGS: Partial<Record<string, FormatMapping>> = {
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

export const FORMAT_KEYS = new Set(Object.keys(FORMAT_MAPPINGS));

export class FormatMapper {
  constructor(private readonly context: WriterContext) {}

  map(schema: JsonSchemaObjectType, subject: string, isBlank: boolean): void {
    if (schema.format == null) return;
    const mapping = FORMAT_MAPPINGS[schema.format];
    if (mapping == null) return;

    match([mapping, isBlank])
      .with([{ type: 'datatype' }, true], () =>
        this.context.store.blank(subject, SHACL_DATATYPE, mapping.value)
      )
      .with([{ type: 'datatype' }, false], () =>
        this.context.store.triple(subject, SHACL_DATATYPE, mapping.value, false)
      )
      .with([{ type: 'nodeKind' }, true], () =>
        this.context.store.blank(subject, SHACL_NODE_KIND, mapping.value)
      )
      .with([{ type: 'nodeKind' }, false], () =>
        this.context.store.triple(subject, SHACL_NODE_KIND, mapping.value, false)
      )
      .with([{ type: 'pattern' }, P._], () =>
        this.context.store.literalString(subject, SHACL_PATTERN, mapping.value, isBlank)
      )
      .exhaustive();
  }
}
