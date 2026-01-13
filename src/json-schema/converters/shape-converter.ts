import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchemaType } from '../meta/json-schema-type';
import { ConstraintConverter } from './constraints/constraint-converter';
import { ShapeMetadataConverter } from './shape-metadata-converter';

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
    // Apply shape metadata (message, severity, deactivated, etc.) to the schema
    const propertyBuilder = JsonSchemaObjectBuilder.from(schema);
    new ShapeMetadataConverter(this.shape).applyToBuilder(propertyBuilder);
    const schemaWithMetadata = propertyBuilder.build();
    const possibleTargets = this.shape.targets;
    if (possibleTargets.length > 0) {
      const target = possibleTargets[0];
      this.builder.properties({
        ...(this.builder.getKey('properties') as Record<string, JsonSchemaType>),
        [target]: this.sb.getContext().isInvalid ? false : schemaWithMetadata,
      });
    } else {
      this.builder.mergeFrom(schemaWithMetadata);
    }
  }
}
