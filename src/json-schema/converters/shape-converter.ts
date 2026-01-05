import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchemaType } from '../meta/json-schema-type';
import { ConstraintConverter } from './constraints/constraint-converter';

import { StackElement } from '../../stack/stack-element';
import { StackElementBuilder } from '../../stack/stack-element-builder';
import { JsonSchemaObjectBuilder } from '../meta/json-schema-object-builder';

export class ShapeConverter {
  private readonly shape: ShapeDefinition;
  private readonly builder: JsonSchemaObjectBuilder;

  constructor(
    private readonly sb: StackElementBuilder,
    private readonly processed: Map<ShapeDefinition, StackElement>
  ) {
    this.builder = sb.getBuilder();
    this.shape = sb.getShape();
  }

  convert() {
    const schema = new ConstraintConverter(this.sb, this.processed).convert();
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
