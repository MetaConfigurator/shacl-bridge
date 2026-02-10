import { JsonSchemaObjectBuilder } from '../json-schema/meta/json-schema-object-builder';
import { ShapeDefinitionBuilder } from '../ir/shape-definition-builder';
import { ConversionContext } from '../json-schema/converters/constraints/conversion-context';
import { StackElement } from './stack-element';
import { StackElementBuilder } from './stack-element-builder';

export class Stack {
  private items: StackElementBuilder[] = [];

  static default(): StackElement {
    return {
      shape: new ShapeDefinitionBuilder('').build(),
      dependentsProcessed: false,
      builder: new JsonSchemaObjectBuilder(),
      context: new ConversionContext(
        new ShapeDefinitionBuilder('').build(),
        new ShapeDefinitionBuilder('').build()
      ),
      isRoot: false,
    };
  }

  push(builder: StackElementBuilder): void {
    this.items.push(builder);
  }

  pop(): StackElementBuilder | undefined {
    return this.items.pop();
  }

  peek(): StackElementBuilder | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  includes(element: StackElementBuilder): boolean {
    return (
      this.items
        .map((sb) => sb.build())
        .filter((item) => item.shape.nodeKey == element.build().shape.nodeKey).length > 0
    );
  }

  toggle(element: StackElementBuilder): void {
    element.toggle();
  }
}
