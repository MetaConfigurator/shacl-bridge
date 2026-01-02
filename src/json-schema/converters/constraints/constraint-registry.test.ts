import { ConstraintRegistry } from './constraint-registry';
import { ConstraintStrategy } from './constraint-strategy';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { NoStrategy } from './strategies/no-strategy';
import { ConstraintResult } from './constraint-converter';

describe('ConstraintRegistry', () => {
  describe('Strategy Registration', () => {
    it('should register a single strategy', () => {
      const registry = new ConstraintRegistry();
      const mockStrategy: ConstraintStrategy = {
        handle: jest.fn(),
      };

      registry.strategy('minLength', mockStrategy);

      const retrieved = registry.get('minLength');
      expect(retrieved).toBe(mockStrategy);
    });

    it('should register multiple strategies using fluent interface', () => {
      const registry = new ConstraintRegistry();
      const strategy1: ConstraintStrategy = { handle: jest.fn() };
      const strategy2: ConstraintStrategy = { handle: jest.fn() };
      const strategy3: ConstraintStrategy = { handle: jest.fn() };

      const result = registry
        .strategy('minLength', strategy1)
        .strategy('maxLength', strategy2)
        .strategy('pattern', strategy3);

      expect(result).toBe(registry); // Fluent interface returns this
      expect(registry.get('minLength')).toBe(strategy1);
      expect(registry.get('maxLength')).toBe(strategy2);
      expect(registry.get('pattern')).toBe(strategy3);
    });

    it('should allow registering all constraint types', () => {
      const registry = new ConstraintRegistry();
      const mockStrategy: ConstraintStrategy = { handle: jest.fn() };

      const constraintKeys: (keyof CoreConstraints)[] = [
        'minLength',
        'maxLength',
        'pattern',
        'minInclusive',
        'maxInclusive',
        'minExclusive',
        'maxExclusive',
        'nodeKind',
        'in',
        'property',
        'class',
        'closed',
        'datatype',
      ];

      constraintKeys.forEach((key) => {
        registry.strategy(key, mockStrategy);
      });

      constraintKeys.forEach((key) => {
        expect(registry.get(key)).toBe(mockStrategy);
      });
    });

    it('should return this to enable method chaining', () => {
      const registry = new ConstraintRegistry();
      const mockStrategy: ConstraintStrategy = { handle: jest.fn() };

      const result = registry.strategy('minLength', mockStrategy);

      expect(result).toBe(registry);
      expect(result).toBeInstanceOf(ConstraintRegistry);
    });
  });

  describe('Strategy Retrieval', () => {
    it('should retrieve a registered strategy', () => {
      const registry = new ConstraintRegistry();
      const mockStrategy: ConstraintStrategy = { handle: jest.fn() };

      registry.strategy('pattern', mockStrategy);

      expect(registry.get('pattern')).toBe(mockStrategy);
    });

    it('should return NoStrategy for unregistered constraint', () => {
      const registry = new ConstraintRegistry();

      const result = registry.get('minLength');

      expect(result).toBeInstanceOf(NoStrategy);
    });

    it('should return different NoStrategy instances for each unregistered call', () => {
      const registry = new ConstraintRegistry();

      const result1 = registry.get('minLength');
      const result2 = registry.get('maxLength');

      expect(result1).toBeInstanceOf(NoStrategy);
      expect(result2).toBeInstanceOf(NoStrategy);
      expect(result1).not.toBe(result2);
    });

    it('should return undefined when has() check fails but still instantiate NoStrategy', () => {
      const registry = new ConstraintRegistry();

      const result = registry.get('unknownConstraint' as keyof CoreConstraints);

      expect(result).toBeInstanceOf(NoStrategy);
    });
  });

  describe('Strategy Overwriting', () => {
    it('should overwrite existing strategy when registering with same key', () => {
      const registry = new ConstraintRegistry();
      const strategy1: ConstraintStrategy = { handle: jest.fn() };
      const strategy2: ConstraintStrategy = { handle: jest.fn() };

      registry.strategy('minLength', strategy1);
      registry.strategy('minLength', strategy2);

      expect(registry.get('minLength')).toBe(strategy2);
      expect(registry.get('minLength')).not.toBe(strategy1);
    });

    it('should maintain other strategies when overwriting one', () => {
      const registry = new ConstraintRegistry();
      const strategy1: ConstraintStrategy = { handle: jest.fn() };
      const strategy2: ConstraintStrategy = { handle: jest.fn() };
      const strategy3: ConstraintStrategy = { handle: jest.fn() };

      registry
        .strategy('minLength', strategy1)
        .strategy('maxLength', strategy2)
        .strategy('minLength', strategy3);

      expect(registry.get('minLength')).toBe(strategy3);
      expect(registry.get('maxLength')).toBe(strategy2);
    });
  });

  describe('Multiple Registrations', () => {
    it('should handle empty registry', () => {
      const registry = new ConstraintRegistry();

      const result = registry.get('minLength');

      expect(result).toBeInstanceOf(NoStrategy);
    });

    it('should handle registration and retrieval of many strategies', () => {
      const registry = new ConstraintRegistry();
      const strategies = new Map<keyof CoreConstraints, ConstraintStrategy>();

      for (let i = 0; i < 10; i++) {
        const key = `minLength` as keyof CoreConstraints;
        const strategy: ConstraintStrategy = { handle: jest.fn() };
        strategies.set(key, strategy);
        registry.strategy(key, strategy);
      }

      // Should get the last registered strategy
      const lastStrategy = Array.from(strategies.values()).pop();
      expect(registry.get('minLength')).toBe(lastStrategy);
    });
  });

  describe('Integration with Strategy Pattern', () => {
    it('should store and retrieve actual strategy implementations', () => {
      const registry = new ConstraintRegistry();
      const mockHandle = jest.fn();
      const strategy: ConstraintStrategy = {
        handle: mockHandle,
      };

      registry.strategy('minLength', strategy);
      const retrieved = registry.get('minLength');

      const mockConstraints: CoreConstraints = { minLength: 5 };
      const mockResult: ConstraintResult = {};
      retrieved?.handle(mockConstraints, mockResult);

      expect(mockHandle).toHaveBeenCalledWith(mockConstraints, mockResult);
    });

    it('should work with different strategy implementations', () => {
      const registry = new ConstraintRegistry();

      const stringStrategy: ConstraintStrategy = {
        handle: (constraints, result) => {
          if (constraints.pattern) result.pattern = constraints.pattern;
        },
      };

      const numericStrategy: ConstraintStrategy = {
        handle: (constraints, result) => {
          if (constraints.minInclusive) result.minimum = constraints.minInclusive;
        },
      };

      registry.strategy('pattern', stringStrategy).strategy('minInclusive', numericStrategy);

      const patternStrat = registry.get('pattern');
      const numericStrat = registry.get('minInclusive');

      expect(patternStrat).toBe(stringStrategy);
      expect(numericStrat).toBe(numericStrategy);
    });
  });

  describe('Type Safety', () => {
    it('should only accept valid constraint keys', () => {
      const registry = new ConstraintRegistry();
      const mockStrategy: ConstraintStrategy = { handle: jest.fn() };

      // These should compile without errors
      registry.strategy('minLength', mockStrategy);
      registry.strategy('maxLength', mockStrategy);
      registry.strategy('pattern', mockStrategy);
      registry.strategy('nodeKind', mockStrategy);

      // TypeScript should prevent invalid keys at compile time
      // registry.strategy('invalidKey', mockStrategy); // Would cause compile error
    });

    it('should maintain type safety for retrieved strategies', () => {
      const registry = new ConstraintRegistry();
      const mockStrategy: ConstraintStrategy = { handle: jest.fn() };

      registry.strategy('minLength', mockStrategy);
      const retrieved = registry.get('minLength');

      expect(retrieved).toBeDefined();
      expect(typeof retrieved?.handle).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive registrations', () => {
      const registry = new ConstraintRegistry();

      for (let i = 0; i < 100; i++) {
        const strategy: ConstraintStrategy = { handle: jest.fn() };
        registry.strategy('minLength', strategy);
      }

      const result = registry.get('minLength');
      expect(result).toBeDefined();
    });

    it('should handle retrieval before any registration', () => {
      const registry = new ConstraintRegistry();

      const result = registry.get('minLength');

      expect(result).toBeInstanceOf(NoStrategy);
    });

    it('should handle mixed registration and retrieval operations', () => {
      const registry = new ConstraintRegistry();
      const strategy1: ConstraintStrategy = { handle: jest.fn() };
      const strategy2: ConstraintStrategy = { handle: jest.fn() };

      registry.strategy('minLength', strategy1);
      const retrieved1 = registry.get('minLength');

      registry.strategy('maxLength', strategy2);
      const retrieved2 = registry.get('maxLength');
      const retrieved1Again = registry.get('minLength');

      expect(retrieved1).toBe(strategy1);
      expect(retrieved2).toBe(strategy2);
      expect(retrieved1Again).toBe(strategy1);
    });
  });

  describe('Fluent Interface Chain', () => {
    it('should support long chains of strategy registrations', () => {
      const registry = new ConstraintRegistry();
      const strategies = {
        minLength: { handle: jest.fn() } as ConstraintStrategy,
        maxLength: { handle: jest.fn() } as ConstraintStrategy,
        pattern: { handle: jest.fn() } as ConstraintStrategy,
        minInclusive: { handle: jest.fn() } as ConstraintStrategy,
        maxInclusive: { handle: jest.fn() } as ConstraintStrategy,
      };

      const result = registry
        .strategy('minLength', strategies.minLength)
        .strategy('maxLength', strategies.maxLength)
        .strategy('pattern', strategies.pattern)
        .strategy('minInclusive', strategies.minInclusive)
        .strategy('maxInclusive', strategies.maxInclusive);

      expect(result).toBe(registry);
      expect(registry.get('minLength')).toBe(strategies.minLength);
      expect(registry.get('maxLength')).toBe(strategies.maxLength);
      expect(registry.get('pattern')).toBe(strategies.pattern);
      expect(registry.get('minInclusive')).toBe(strategies.minInclusive);
      expect(registry.get('maxInclusive')).toBe(strategies.maxInclusive);
    });
  });
});
