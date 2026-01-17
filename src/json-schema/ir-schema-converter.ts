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
import { ShaclDocument } from '../shacl/shacl-document';

export class IrSchemaConverter {
  private processed = new Map<ShapeDefinition, StackElement>();
  private shapeDefinitions: ShapeDefinition[] = [];
  private shaclDocument: ShaclDocument;

  constructor(private readonly ir: IntermediateRepresentation) {
    this.shapeDefinitions = ir.shapeDefinitions;
    this.shaclDocument = ir.shaclDocument;
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
      .customProperty('x-shacl-prefixes', this.addPrefixes())
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
    stack.push(new StackElementBuilder().shape(shapeDef).isRoot(true));
    while (!stack.isEmpty()) {
      const top = stack.peek() ?? new StackElementBuilder();
      if (!top.getDependentsProcessed() && (top.getShape().dependentShapes?.length ?? 0) > 0)
        this.addDependentShapes(stack, top);
      else this.buildJsonSchema(stack, shapeDef);
    }
    return this.processed.get(shapeDef)?.builder.build() ?? {};
  }
  private addDependentShapes(stack: Stack, sb: StackElementBuilder) {
    stack.toggle(sb);
    sb.getShape().dependentShapes?.forEach((dependentShape) => {
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
  }

  private buildJsonSchema(stack: Stack, shapeDef: ShapeDefinition) {
    const top = stack.pop();
    if (top == null) return;
    if (!top.getIsRoot()) new ShapeConverter(top, this.processed).convert();
    else top.getBuilder().title(shapeDef.targets[0]).type('object');
    this.absorbDependentBuilders(top);
    this.buildRoot(top);
    this.processed.set(top.getShape(), top.build());
  }

  private buildRoot(top: StackElementBuilder) {
    if (!top.getIsRoot()) return;
    top.getBuilder().type('object').additionalProperties(!top.getShape().coreConstraints?.closed);
    new ShapeMetadataConverter(top.getShape()).applyToBuilder(top.getBuilder());
    top.getBuilder().mergeFrom(new ConstraintConverter(top, this.processed).convert());
  }

  private absorbDependentBuilders(top: StackElementBuilder) {
    if ((top.getShape().dependentShapes?.length ?? 0) == 0) return;
    top.getShape().dependentShapes?.forEach((dependentShape) => {
      const dependent = this.processed.get(dependentShape);
      if (dependent != null) {
        if (dependent.isLogicalFragment) return;
        top.getBuilder().properties({
          ...(top.getBuilder().getKey('properties') as Record<string, JsonSchemaType>),
          ...(dependent.builder.getKey('properties') as Record<string, JsonSchemaType>),
        });
        if (dependent.context.required)
          top.getBuilder().requiredElement(dependent.shape.targets[0]);
      }
    });
  }

  private addPrefixes(): Record<string, string> {
    const prefixes = this.shaclDocument.prefix;
    const prefixMap: Record<string, string> = {};
    Object.keys(prefixes).forEach((key) => {
      prefixMap[key] = prefixes[key] as unknown as string;
    });
    return prefixMap;
  }
}
