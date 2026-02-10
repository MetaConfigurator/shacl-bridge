import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { JsonSchemaObjectBuilder } from '../json-schema/meta/json-schema-object-builder';
import { ConversionContext } from '../json-schema/converters/constraints/conversion-context';

export interface StackElement {
  shape: ShapeDefinition;
  dependentsProcessed: boolean;
  builder: JsonSchemaObjectBuilder;
  context: ConversionContext;
  isRoot: boolean;
}
