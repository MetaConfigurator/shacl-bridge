import { Stack } from './stack';
import { StackElementBuilder } from './stack-element-builder';
import { ShapeDefinitionBuilder } from '../ir/shape-definition-builder';

describe('Stack', () => {
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
  });

  describe('default()', () => {
    it('should create a default stack element with expected properties', () => {
      const defaultElement = Stack.default();

      expect(defaultElement.shape).toBeDefined();
      expect(defaultElement.dependentsProcessed).toBe(false);
      expect(defaultElement.builder).toBeDefined();
      expect(defaultElement.context).toBeDefined();
      expect(defaultElement.isRoot).toBe(false);
      expect(defaultElement.isLogicalFragment).toBe(false);
    });
  });

  describe('push and pop', () => {
    it('should push and pop elements', () => {
      const element1 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('shape1').build()
      );
      const element2 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('shape2').build()
      );

      stack.push(element1);
      stack.push(element2);

      expect(stack.pop()).toBe(element2);
      expect(stack.pop()).toBe(element1);
      expect(stack.pop()).toBeUndefined();
    });

    it('should return undefined when popping from empty stack', () => {
      expect(stack.pop()).toBeUndefined();
    });
  });

  describe('peek', () => {
    it('should return the top element without removing it', () => {
      const element1 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('shape1').build()
      );
      const element2 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('shape2').build()
      );

      stack.push(element1);
      stack.push(element2);

      expect(stack.peek()).toBe(element2);
      expect(stack.peek()).toBe(element2); // Still there
      expect(stack.isEmpty()).toBe(false);
    });

    it('should return undefined when peeking empty stack', () => {
      expect(stack.peek()).toBeUndefined();
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty stack', () => {
      expect(stack.isEmpty()).toBe(true);
    });

    it('should return false for non-empty stack', () => {
      const element = new StackElementBuilder().shape(new ShapeDefinitionBuilder('shape1').build());
      stack.push(element);

      expect(stack.isEmpty()).toBe(false);
    });

    it('should return true after all elements are popped', () => {
      const element = new StackElementBuilder().shape(new ShapeDefinitionBuilder('shape1').build());
      stack.push(element);
      stack.pop();

      expect(stack.isEmpty()).toBe(true);
    });
  });

  describe('includes', () => {
    it('should return true when stack contains element with same nodeKey', () => {
      const nodeKey = 'http://example.com/shape1';
      const element1 = new StackElementBuilder().shape(new ShapeDefinitionBuilder(nodeKey).build());
      const element2 = new StackElementBuilder().shape(new ShapeDefinitionBuilder(nodeKey).build());

      stack.push(element1);

      expect(stack.includes(element2)).toBe(true);
    });

    it('should return false when stack does not contain element with same nodeKey', () => {
      const element1 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape1').build()
      );
      const element2 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape2').build()
      );

      stack.push(element1);

      expect(stack.includes(element2)).toBe(false);
    });

    it('should return false for empty stack', () => {
      const element = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape1').build()
      );

      expect(stack.includes(element)).toBe(false);
    });

    it('should find element among multiple stack items', () => {
      const element1 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape1').build()
      );
      const element2 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape2').build()
      );
      const element3 = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape3').build()
      );
      const searchElement = new StackElementBuilder().shape(
        new ShapeDefinitionBuilder('http://example.com/shape2').build()
      );

      stack.push(element1);
      stack.push(element2);
      stack.push(element3);

      expect(stack.includes(searchElement)).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should delegate toggle to the element', () => {
      const element = new StackElementBuilder().dependentsProcessed(false);

      expect(element.getDependentsProcessed()).toBe(false);
      stack.toggle(element);
      expect(element.getDependentsProcessed()).toBe(true);
      stack.toggle(element);
      expect(element.getDependentsProcessed()).toBe(false);
    });
  });
});
