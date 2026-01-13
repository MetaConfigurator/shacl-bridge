import { StackElementBuilder } from './stack-element-builder';
import { ShapeDefinitionBuilder } from '../ir/shape-definition-builder';
import { JsonSchemaObjectBuilder } from '../json-schema/meta/json-schema-object-builder';

describe('StackElementBuilder', () => {
  let builder: StackElementBuilder;

  beforeEach(() => {
    builder = new StackElementBuilder();
  });

  describe('fluent builder pattern', () => {
    it('should support method chaining', () => {
      const shape = new ShapeDefinitionBuilder('http://example.com/shape').build();
      const jsonSchemaBuilder = new JsonSchemaObjectBuilder();

      const result = builder
        .shape(shape)
        .dependentsProcessed(true)
        .builder(jsonSchemaBuilder)
        .isRoot(true)
        .isLogicalFragment(false);

      expect(result).toBe(builder);
    });

    it('should build element with all configured properties', () => {
      const shape = new ShapeDefinitionBuilder('http://example.com/shape').build();
      const jsonSchemaBuilder = new JsonSchemaObjectBuilder();

      const element = builder
        .shape(shape)
        .dependentsProcessed(true)
        .builder(jsonSchemaBuilder)
        .isRoot(true)
        .isLogicalFragment(false)
        .build();

      expect(element.shape).toBe(shape);
      expect(element.dependentsProcessed).toBe(true);
      expect(element.builder).toBe(jsonSchemaBuilder);
      expect(element.isRoot).toBe(true);
      expect(element.isLogicalFragment).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('should toggle dependentsProcessed from false to true', () => {
      builder.dependentsProcessed(false);
      expect(builder.getDependentsProcessed()).toBe(false);

      builder.toggle();
      expect(builder.getDependentsProcessed()).toBe(true);
    });

    it('should toggle dependentsProcessed from true to false', () => {
      builder.dependentsProcessed(true);
      expect(builder.getDependentsProcessed()).toBe(true);

      builder.toggle();
      expect(builder.getDependentsProcessed()).toBe(false);
    });

    it('should support chaining after toggle', () => {
      const shape = new ShapeDefinitionBuilder('http://example.com/shape').build();

      const result = builder.dependentsProcessed(false).toggle().shape(shape);

      expect(result).toBe(builder);
      expect(builder.getDependentsProcessed()).toBe(true);
      expect(builder.getShape()).toBe(shape);
    });
  });

  describe('default values', () => {
    it('should use default JsonSchemaObjectBuilder when builder() called without argument', () => {
      builder.builder();
      const element = builder.build();

      expect(element.builder).toBeInstanceOf(JsonSchemaObjectBuilder);
    });

    it('should use default false for dependentsProcessed when called without argument', () => {
      builder.dependentsProcessed();
      const element = builder.build();

      expect(element.dependentsProcessed).toBe(false);
    });

    it('should use default false for isLogicalFragment when called without argument', () => {
      builder.isLogicalFragment();
      const element = builder.build();

      expect(element.isLogicalFragment).toBe(false);
    });

    it('should use default false for isRoot when called without argument', () => {
      builder.isRoot();
      const element = builder.build();

      expect(element.isRoot).toBe(false);
    });
  });

  describe('shape configuration', () => {
    it('should set and retrieve shape', () => {
      const shape1 = new ShapeDefinitionBuilder('http://example.com/shape1').build();
      const shape2 = new ShapeDefinitionBuilder('http://example.com/shape2').build();

      builder.shape(shape1);
      expect(builder.getShape()).toBe(shape1);

      builder.shape(shape2);
      expect(builder.getShape()).toBe(shape2);
    });
  });

  describe('context configuration', () => {
    it('should create default context based on shape when called without argument', () => {
      const shape = new ShapeDefinitionBuilder('http://example.com/shape').build();
      builder.shape(shape);
      builder.context();

      const context = builder.getContext();
      expect(context).toBeDefined();
      expect(context.constraints).toBeDefined();
    });
  });

  describe('build()', () => {
    it('should return the configured stack element', () => {
      const shape = new ShapeDefinitionBuilder('http://example.com/shape').build();

      builder.shape(shape).isRoot(true);
      const element = builder.build();

      expect(element.shape).toBe(shape);
      expect(element.isRoot).toBe(true);
    });

    it('should return same element reference on multiple build() calls', () => {
      const element1 = builder.build();
      const element2 = builder.build();

      expect(element1).toBe(element2);
    });
  });
});
