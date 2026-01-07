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

export class IrSchemaConverter {
  private processed = new Map<ShapeDefinition, StackElement>();

  constructor(private readonly ir: IntermediateRepresentation) {}

  convert(): JsonSchemaObjectType {
    let builder = new JsonSchemaObjectBuilder();
    const { shapeDefinitions } = this.ir;
    if (shapeDefinitions.length == 0) return builder.build();
    const schemas = new Map<ShapeDefinition, JsonSchemaObjectType>();
    for (const shapeDef of shapeDefinitions) {
      schemas.set(shapeDef, this.processBottomUp(shapeDef));
    }

    if (schemas.size > 1) {
      const firstSchema = [...schemas.entries()].map(([shape, schema]) => {
        return {
          shape: shape,
          schema: schema,
        };
      })[0];
      builder.$id(firstSchema.shape.nodeKey).$schema(JSON_SCHEMA_DRAFT);

      [...schemas.entries()]
        .map(([shape, schema]) => {
          return {
            shape: shape,
            schema: schema,
          };
        })
        .forEach((element) => {
          const { shape, schema } = element;
          const target = shape.targets[0];
          builder.$defs({
            ...(builder.getKey('$defs') as Record<string, JsonSchemaType>),
            [target]: schema,
          });
        });
      builder.$ref(`#/$defs/${firstSchema.shape.targets[0]}`);
    } else {
      builder = JsonSchemaObjectBuilder.from(schemas.get(shapeDefinitions[0]) ?? {});
      builder.$id(shapeDefinitions[0].nodeKey).$schema(JSON_SCHEMA_DRAFT);
    }
    return builder.build();
  }

  private isLogicalConstraintFragment(parentShape: ShapeDefinition, childNodeKey: string): boolean {
    const constraints = parentShape.coreConstraints;
    if (!constraints) return false;

    return (
      constraints.or?.some((ref) => ref.includes(childNodeKey)) ??
      constraints.and?.some((ref) => ref.includes(childNodeKey)) ??
      constraints.xone?.some((ref) => ref.includes(childNodeKey)) ??
      constraints.not?.includes(childNodeKey) ??
      false
    );
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
