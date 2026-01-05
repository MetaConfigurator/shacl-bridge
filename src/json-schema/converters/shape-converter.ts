import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchemaType } from '../meta/json-schema-type';
import { JsonSchemaObjectBuilder } from '../meta/json-schema-object-builder';
import { ConstraintConverter } from './constraints/constraint-converter';
import { ConversionContext } from './constraints/conversion-context';
import { StackElement } from '../../stack/stack';

export class ShapeConverter {
  constructor(
    private builder: JsonSchemaObjectBuilder,
    private readonly shape: ShapeDefinition,
    private readonly context: ConversionContext,
    private readonly processed: Map<ShapeDefinition, StackElement>
  ) {}

  convert() {
    const schema = new ConstraintConverter(
      this.shape.coreConstraints ?? {},
      this.context,
      this.processed
    ).convert();
    const possibleTargets = this.shape.targets;
    if (possibleTargets.length > 0) {
      const target = possibleTargets[0];
      this.builder.properties({
        ...(this.builder.getKey('properties') as Record<string, JsonSchemaType>),
        [target]: schema,
      });
    } else {
      this.builder.mergeFrom(schema);
    }
  }
}
