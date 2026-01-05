import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { JsonSchemaObjectBuilder } from '../json-schema/meta/json-schema-object-builder';
import { ShapeDefinitionBuilder } from '../ir/shape-definition-builder';
import { ConversionContext } from '../json-schema/converters/constraints/conversion-context';

export interface StackElement {
  shape: ShapeDefinition;
  dependentsProcessed: boolean;
  builder: JsonSchemaObjectBuilder;
  context: ConversionContext;
  isRoot: boolean;
}

export class Stack {
  private items: StackElement[] = [];

  push(
    shape: ShapeDefinition,
    dependentsProcessed: boolean,
    builder: JsonSchemaObjectBuilder,
    context: ConversionContext,
    isRoot = false
  ): void {
    this.items.push({ shape, dependentsProcessed, builder, context, isRoot });
  }

  pop(): StackElement | undefined {
    return this.items.pop();
  }

  peek(): StackElement | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  includes(element: StackElement): boolean {
    return this.items.filter((item) => item.shape.nodeKey == element.shape.nodeKey).length > 0;
  }

  toggle(element: StackElement): void {
    this.pop();
    const { shape, dependentsProcessed, builder, context, isRoot } = element;
    this.push(shape, !dependentsProcessed, builder, context, isRoot);
  }

  static default(): StackElement {
    return {
      shape: new ShapeDefinitionBuilder('').build(),
      dependentsProcessed: false,
      builder: new JsonSchemaObjectBuilder(),
      context: new ConversionContext(new ShapeDefinitionBuilder('').build()),
      isRoot: false,
    };
  }
}
