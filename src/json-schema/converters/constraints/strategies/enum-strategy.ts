import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import { ConstraintResult } from '../constraint-converter';
import { JsonSchemaObjectType } from '../../../json-schema-type';

export class EnumStrategy<K extends keyof CoreConstraints, S extends keyof ConstraintResult>
  implements ConstraintStrategy
{
  constructor(
    private readonly constraintKey: K,
    private readonly schemaKey: S
  ) {}

  handle(constraints: CoreConstraints, schema: JsonSchemaObjectType): void {
    const value = constraints[this.constraintKey];
    if (value == null) return;
    if (!Array.isArray(value) || value.length == 0) return;
    schema[this.schemaKey] = value as ConstraintResult[S];
  }
}
