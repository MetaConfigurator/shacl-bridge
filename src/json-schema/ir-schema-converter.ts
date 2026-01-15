import { IntermediateRepresentation } from '../ir/intermediate-representation-builder';
import { JsonSchemaObjectType, JsonSchemaType } from './meta/json-schema-type';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { Stack } from '../stack/stack';
import { ShapeConverter } from './converters/shape-converter';
import { JsonSchemaObjectBuilder } from './meta/json-schema-object-builder';
import { ConversionContext } from './converters/constraints/conversion-context';
import { JSON_SCHEMA_DRAFT } from '../util/json-schema-terms';
import { StackElement } from '../stack/stack-element';
import { StackElementBuilder } from '../stack/stack-element-builder';
import { ShapeMetadataConverter } from './converters/shape-metadata-converter';
import { ConstraintConverter } from './converters/constraints/constraint-converter';
import { Condition } from '../condition/condition';

export class IrSchemaConverter {
  private processed = new Map<ShapeDefinition, StackElement>();
  private shapeDefinitions: ShapeDefinition[] = [];

  constructor(private readonly ir: IntermediateRepresentation) {
    this.shapeDefinitions = ir.shapeDefinitions;
  }

  convert(): JsonSchemaObjectType {
    const builder = new JsonSchemaObjectBuilder();
    if (this.shapeDefinitions.length == 0) return builder.build();
    this.shapeDefinitions
      .map((shapeDefinition) => {
        return { shape: shapeDefinition, schema: this.processBottomUp(shapeDefinition) };
      })
      .forEach((element) => {
        const { shape, schema } = element;
        const target = shape.targets[0];
        builder.$defs({
          ...(builder.getKey('$defs') as Record<string, JsonSchemaType>),
          [target]: schema,
        });
      });
    return builder
      .$id(this.shapeDefinitions[0].nodeKey)
      .$schema(JSON_SCHEMA_DRAFT)
      .$ref(`#/$defs/${this.shapeDefinitions[0].targets[0]}`)
      .build();
  }

  private isLogicalConstraintFragment(parentShape: ShapeDefinition, childNodeKey: string): boolean {
    return new Condition()
      .on(parentShape.coreConstraints)
      .must((constraints) => constraints != null)
      .anyOf((constraints) => constraints?.or?.some((ref) => ref.includes(childNodeKey)) ?? false)
      .anyOf((constraints) => constraints?.and?.some((ref) => ref.includes(childNodeKey)) ?? false)
      .anyOf((constraints) => constraints?.xone?.some((ref) => ref.includes(childNodeKey)) ?? false)
      .anyOf((constraints) => constraints?.not?.includes(childNodeKey) ?? false)
      .execute();
  }

  private processBottomUp(shapeDef: ShapeDefinition): JsonSchemaObjectType {
    const stack = new Stack();
    stack.push(new StackElementBuilder().shape(shapeDef).builder().context().isRoot(true));
    while (!stack.isEmpty()) {
      const sb = stack.peek() ?? new StackElementBuilder();
      if (!sb.getDependentsProcessed() && (sb.getShape().dependentShapes?.length ?? 0) > 0) {
        stack.toggle(sb);
        sb.getShape().dependentShapes?.forEach((dependentShape) => {
          // Check if this dependent is a logical constraint fragment
          const isLogicalFragment = this.isLogicalConstraintFragment(
            sb.getShape(),
            dependentShape.nodeKey
          );
          stack.push(
            new StackElementBuilder()
              .shape(dependentShape)
              .context(new ConversionContext(dependentShape, isLogicalFragment))
              .isLogicalFragment(isLogicalFragment)
          );
        });
      } else {
        const top = stack.pop();
        if (top == null) continue;
        if (!top.getIsRoot()) new ShapeConverter(top, this.processed).convert();
        else top.getBuilder().title(shapeDef.targets[0]).type('object');
        if ((top.getShape().dependentShapes?.length ?? 0) > 0) {
          top.getShape().dependentShapes?.forEach((dependentShape) => {
            const dependent = this.processed.get(dependentShape);
            if (dependent != null) {
              // Skip property merging for logical constraint fragments
              if (dependent.isLogicalFragment) return;

              top.getBuilder().properties({
                ...(top.getBuilder().getKey('properties') as Record<string, JsonSchemaType>),
                ...(dependent.builder.getKey('properties') as Record<string, JsonSchemaType>),
              });
              // Track required properties for all shapes, not just root
              if (dependent.context.required)
                top.getBuilder().requiredElement(dependent.shape.targets[0]);
            }
          });
        }
        if (top.getIsRoot()) {
          top
            .getBuilder()
            .type('object')
            .additionalProperties(!top.getShape().coreConstraints?.closed);

          // Apply shape metadata to root shape
          new ShapeMetadataConverter(top.getShape()).applyToBuilder(top.getBuilder());
          top.getBuilder().mergeFrom(new ConstraintConverter(top, this.processed).convert());
        }
        this.processed.set(top.getShape(), top.build());
      }
    }
    return this.processed.get(shapeDef)?.builder.build() ?? {};
  }
}
