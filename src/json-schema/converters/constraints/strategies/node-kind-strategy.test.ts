import { NodeKindStrategy } from './node-kind-strategy';
import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { NodeKind } from '../../../../ir/meta-model/node-kind';
import { ConstraintResult } from '../constraint-converter';

describe('NodeKindStrategy', () => {
  let strategy: NodeKindStrategy;

  beforeEach(() => {
    strategy = new NodeKindStrategy();
  });

  describe('IRI NodeKind', () => {
    it('should map NodeKind.IRI to type string with format uri', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
      expect(result['x-shacl-nodeKind']).toBeUndefined();
    });

    it('should overwrite existing type when nodeKind is IRI', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
      };
      const result: ConstraintResult = {
        type: 'number',
      };

      strategy.handle(constraints, result);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should overwrite existing format when nodeKind is IRI', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
      };
      const result: ConstraintResult = {
        type: 'string',
        format: 'email',
      };

      strategy.handle(constraints, result);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });
  });

  describe('LITERAL NodeKind', () => {
    it('should map NodeKind.LITERAL to x-shacl-nodeKind extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.LITERAL,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:Literal');
      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
    });

    it('should not modify type or format when nodeKind is LITERAL', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.LITERAL,
      };
      const result: ConstraintResult = {
        type: 'string',
        format: 'email',
      };

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:Literal');
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });
  });

  describe('BLANK_NODE NodeKind', () => {
    it('should map NodeKind.BLANK_NODE to x-shacl-nodeKind extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.BLANK_NODE,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNode');
      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
    });
  });

  describe('BLANK_NODE_OR_IRI NodeKind', () => {
    it('should map NodeKind.BLANK_NODE_OR_IRI to x-shacl-nodeKind extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.BLANK_NODE_OR_IRI,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNodeOrIRI');
      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
    });
  });

  describe('IRI_OR_LITERAL NodeKind', () => {
    it('should map NodeKind.IRI_OR_LITERAL to x-shacl-nodeKind extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI_OR_LITERAL,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:IRIOrLiteral');
      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
    });
  });

  describe('BLANK_NODE_OR_LITERAL NodeKind', () => {
    it('should map NodeKind.BLANK_NODE_OR_LITERAL to x-shacl-nodeKind extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.BLANK_NODE_OR_LITERAL,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:BlankNodeOrLiteral');
      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
    });
  });

  describe('Undefined and Null NodeKind', () => {
    it('should not modify result when nodeKind is undefined', () => {
      const constraints: CoreConstraints = {
        nodeKind: undefined,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
      expect(result['x-shacl-nodeKind']).toBeUndefined();
    });

    it('should not modify result when nodeKind is null', () => {
      const constraints: CoreConstraints = {
        nodeKind: null as unknown as NodeKind,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.type).toBeUndefined();
      expect(result.format).toBeUndefined();
      expect(result['x-shacl-nodeKind']).toBeUndefined();
    });

    it('should not overwrite existing result when nodeKind is undefined', () => {
      const constraints: CoreConstraints = {
        nodeKind: undefined,
      };
      const result: ConstraintResult = {
        type: 'string',
        format: 'email',
      };

      strategy.handle(constraints, result);

      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
      expect(result['x-shacl-nodeKind']).toBeUndefined();
    });
  });

  describe('Multiple Constraints', () => {
    it('should only handle nodeKind constraint and ignore others', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
        minLength: 5,
        pattern: '^test$',
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
      expect(result.minLength).toBeUndefined();
      expect(result.pattern).toBeUndefined();
    });

    it('should preserve other properties in result when handling nodeKind', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.LITERAL,
      };
      const result: ConstraintResult = {
        minLength: 5,
        maxLength: 100,
      };

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:Literal');
      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
    });
  });

  describe('Extension Property Behavior', () => {
    it('should overwrite existing x-shacl-nodeKind extension', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.LITERAL,
      };
      const result: ConstraintResult = {
        'x-shacl-nodeKind': 'sh:BlankNode',
      };

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBe('sh:Literal');
    });

    it('should set x-shacl-nodeKind for all non-IRI node kinds', () => {
      const testCases: { nodeKind: NodeKind; expected: string }[] = [
        { nodeKind: NodeKind.LITERAL, expected: 'sh:Literal' },
        { nodeKind: NodeKind.BLANK_NODE, expected: 'sh:BlankNode' },
        { nodeKind: NodeKind.BLANK_NODE_OR_IRI, expected: 'sh:BlankNodeOrIRI' },
        { nodeKind: NodeKind.IRI_OR_LITERAL, expected: 'sh:IRIOrLiteral' },
        { nodeKind: NodeKind.BLANK_NODE_OR_LITERAL, expected: 'sh:BlankNodeOrLiteral' },
      ];

      testCases.forEach(({ nodeKind, expected }) => {
        const constraints: CoreConstraints = { nodeKind };
        const result: ConstraintResult = {};

        strategy.handle(constraints, result);

        expect(result['x-shacl-nodeKind']).toBe(expected);
      });
    });
  });

  describe('Exhaustiveness', () => {
    it('should handle all NodeKind enum values', () => {
      const allNodeKinds = [
        NodeKind.IRI,
        NodeKind.LITERAL,
        NodeKind.BLANK_NODE,
        NodeKind.BLANK_NODE_OR_IRI,
        NodeKind.IRI_OR_LITERAL,
        NodeKind.BLANK_NODE_OR_LITERAL,
      ];

      allNodeKinds.forEach((nodeKind) => {
        const constraints: CoreConstraints = { nodeKind };
        const result: ConstraintResult = {};

        expect(() => {
          strategy.handle(constraints, result);
        }).not.toThrow();

        // Verify that result has been modified
        expect(
          result.type !== undefined ||
            result.format !== undefined ||
            result['x-shacl-nodeKind'] !== undefined
        ).toBe(true);
      });
    });
  });

  describe('Type and Format Combinations', () => {
    it('should only set type and format for IRI, not for other node kinds', () => {
      const nonIRINodeKinds = [
        NodeKind.LITERAL,
        NodeKind.BLANK_NODE,
        NodeKind.BLANK_NODE_OR_IRI,
        NodeKind.IRI_OR_LITERAL,
        NodeKind.BLANK_NODE_OR_LITERAL,
      ];

      nonIRINodeKinds.forEach((nodeKind) => {
        const constraints: CoreConstraints = { nodeKind };
        const result: ConstraintResult = {};

        strategy.handle(constraints, result);

        // Type and format should not be set by the strategy
        expect(result.type).toBeUndefined();
        expect(result.format).toBeUndefined();
        // But x-shacl-nodeKind should be set
        expect(result['x-shacl-nodeKind']).toBeDefined();
      });
    });

    it('should not set x-shacl-nodeKind extension for IRI', () => {
      const constraints: CoreConstraints = {
        nodeKind: NodeKind.IRI,
      };
      const result: ConstraintResult = {};

      strategy.handle(constraints, result);

      expect(result['x-shacl-nodeKind']).toBeUndefined();
    });
  });
});
