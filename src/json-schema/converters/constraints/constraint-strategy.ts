import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { JsonSchemaObjectType, JsonSchemaType } from '../../json-schema-type';

export interface ConstraintStrategy {
  handle(constraints: CoreConstraints, result: JsonSchemaObjectType | JsonSchemaType): void;
}
