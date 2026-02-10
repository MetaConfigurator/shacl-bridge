import { StackElement } from './stack-element';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { JsonSchemaObjectBuilder } from '../json-schema/meta/json-schema-object-builder';
import { ConversionContext } from '../json-schema/converters/constraints/conversion-context';
import { Stack } from './stack';

export class StackElementBuilder {
  private stackElement: StackElement = Stack.default();

  shape(_shape: ShapeDefinition) {
    this.stackElement.shape = _shape;
    return this;
  }

  toggle() {
    this.stackElement.dependentsProcessed = !this.stackElement.dependentsProcessed;
    return this;
  }

  dependentsProcessed(_dependentsProcessed = false) {
    this.stackElement.dependentsProcessed = _dependentsProcessed;
    return this;
  }

  builder(_builder = new JsonSchemaObjectBuilder()) {
    this.stackElement.builder = _builder;
    return this;
  }

  context(_context = new ConversionContext(this.stackElement.shape, { nodeKey: '', targets: [] })) {
    this.stackElement.context = _context;
    return this;
  }

  isRoot(_isRoot = false) {
    this.stackElement.isRoot = _isRoot;
    return this;
  }

  build() {
    return this.stackElement;
  }

  getShape() {
    return this.stackElement.shape;
  }

  getDependentsProcessed() {
    return this.stackElement.dependentsProcessed;
  }

  isFragment() {
    return this.stackElement.context.isFragment;
  }

  getBuilder() {
    return this.stackElement.builder;
  }

  getContext() {
    return this.stackElement.context;
  }

  getIsRoot() {
    return this.stackElement.isRoot;
  }
}
