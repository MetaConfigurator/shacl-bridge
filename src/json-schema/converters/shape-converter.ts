import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { JsonSchemaType } from '../meta/json-schema-type';
import { ConstraintConverter } from './constraints/constraint-converter';
import { ShapeMetadataConverter } from './shape-metadata-converter';

import { StackElement } from '../../stack/stack-element';
import { StackElementBuilder } from '../../stack/stack-element-builder';
import { JsonSchemaObjectBuilder } from '../meta/json-schema-object-builder';
import { ConversionOptions } from '../conversion-options';

export class ShapeConverter {
  private readonly shape: ShapeDefinition;
  private readonly builder: JsonSchemaObjectBuilder;
  private readonly options: ConversionOptions;

  constructor(
    private readonly sb: StackElementBuilder,
    private readonly processed: Map<ShapeDefinition, StackElement>,
    options: ConversionOptions = { excludeShaclExtensions: false }
  ) {
    this.builder = sb.getBuilder();
    this.shape = sb.getShape();
    this.options = options;
  }

  convert() {
    const schema = new ConstraintConverter(this.sb, this.processed, this.options).convert();
    const propertyBuilder = JsonSchemaObjectBuilder.from(schema);
    new ShapeMetadataConverter(this.shape, this.options).applyToBuilder(propertyBuilder);
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
