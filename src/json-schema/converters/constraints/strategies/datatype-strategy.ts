import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import { DatatypeMapper } from '../datatype-mapper';
import { JsonSchemaObjectType } from '../../../json-schema-type';

export class DatatypeStrategy implements ConstraintStrategy {
  private readonly datatypeMapper = new DatatypeMapper();

  handle(constraints: CoreConstraints, schema: JsonSchemaObjectType): void {
    const datatype = constraints.datatype;
    if (datatype == null) return;

    const datatypeSchema = this.datatypeMapper.map(datatype);
    Object.assign(schema, datatypeSchema);
  }
}
