import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintResult } from '../constraint-converter';
import { ConstraintStrategy } from '../constraint-strategy';
import { extractStrippedName } from '../../../../util/helpers';
import { JsonSchemaObjectType } from '../../../json-schema-type';

export class DefsStrategy<K extends keyof CoreConstraints, S extends keyof ConstraintResult>
  implements ConstraintStrategy
{
  constructor(
    private readonly constraintKey: K,
    private readonly schemaKey: S
  ) {}

  handle(constraints: CoreConstraints, schema: JsonSchemaObjectType): void {
    const value = constraints[this.constraintKey];
    if (value == null) return;
    const extractedValue = extractStrippedName(value as string);
    schema[this.schemaKey] = `#/$defs/${extractedValue}` as ConstraintResult[S];
  }
}
