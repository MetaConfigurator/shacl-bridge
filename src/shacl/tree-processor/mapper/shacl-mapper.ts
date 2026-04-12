import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import { WriterContext } from '../../writer/writer-context';
import { ConstraintMapper } from './constraint-mapper';
import { FORMAT_KEYS, FormatMapper } from './format-mapper';
import { TypeMapper } from './type-mapper';

export class ShaclMapper {
  private readonly constraintMapper: ConstraintMapper;
  private readonly typeMapper: TypeMapper;
  private readonly formatMapper: FormatMapper;

  constructor(context: WriterContext) {
    this.constraintMapper = new ConstraintMapper(context);
    this.typeMapper = new TypeMapper(context);
    this.formatMapper = new FormatMapper(context);
  }

  map(schema: JsonSchemaObjectType, subject: string, isBlank = false): void {
    this.constraintMapper.map(schema, subject, isBlank);
    this.typeMapper.map(schema, subject, isBlank, FORMAT_KEYS);
    this.formatMapper.map(schema, subject, isBlank);
  }
}
