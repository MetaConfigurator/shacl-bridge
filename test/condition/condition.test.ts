jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

import { Condition } from '../../src/condition/condition';
import logger from '../../src/logger';

describe('Condition', () => {
  let condition: Condition<unknown>;

  beforeEach(() => {
    condition = new Condition();
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should execute ifSatisfied action when all conditions pass', () => {
      const candidate = { value: 10 };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.value > 5)
        .allOf((c) => c.value < 15)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should execute otherwise action when conditions fail', () => {
      const candidate = { value: 3 };
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.value > 5)
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockIfSatisfied).not.toHaveBeenCalled();
      expect(mockOtherwise).toHaveBeenCalledWith(candidate);
      expect(mockOtherwise).toHaveBeenCalledTimes(1);
    });

    it('should execute ifSatisfied action when no conditions are specified', () => {
      const candidate = { value: 10 };
      const mockAction = jest.fn();

      condition.on(candidate).ifSatisfied(mockAction).execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });
  });

  describe('Gate conditions (always)', () => {
    it('should execute onMandatoryConditionFailure when gate condition fails', () => {
      const candidate = { value: 3 };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();

      condition
        .on(candidate)
        .must((c) => c.value > 5)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .execute();

      expect(mockGateFailure).toHaveBeenCalledWith(candidate);
      expect(mockIfSatisfied).not.toHaveBeenCalledWith(candidate);
    });

    it('should execute normal flow when gate conditions pass', () => {
      const candidate = { value: 10 };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();

      condition
        .on(candidate)
        .must((c) => c.value > 5)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .execute();

      expect(logger.error).not.toHaveBeenCalled();
      expect(mockGateFailure).not.toHaveBeenCalled();
      expect(mockIfSatisfied).toHaveBeenCalledWith(candidate);
    });

    it('should check all gate conditions', () => {
      const candidate = { value: 10 };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();

      condition
        .on(candidate)
        .must((c) => c.value > 5)
        .must((c) => c.value < 8)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .execute();

      expect(mockGateFailure).toHaveBeenCalledWith(candidate);
    });

    it('should still evaluate normal conditions even when gate conditions fail', () => {
      const candidate = { value: 3 };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .must((c) => c.value > 10)
        .allOf((c) => c.value < 5)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockGateFailure).toHaveBeenCalledWith(candidate);
      expect(mockIfSatisfied).not.toHaveBeenCalledWith(candidate);
      expect(mockOtherwise).not.toHaveBeenCalled();
    });
  });

  describe('allOf conditions (AND logic)', () => {
    it('should pass when all allOf conditions are satisfied', () => {
      const candidate = { value: 10, name: 'test' };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.value > 5)
        .allOf((c) => c.value < 15)
        .allOf((c) => c.name === 'test')
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should fail when any allOf condition fails', () => {
      const candidate = { value: 10, name: 'test' };
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.value > 5)
        .allOf((c) => c.value < 15)
        .allOf((c) => c.name === 'wrong')
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockIfSatisfied).not.toHaveBeenCalled();
      expect(mockOtherwise).toHaveBeenCalledWith(candidate);
    });
  });

  describe('anyOf conditions (OR logic)', () => {
    it('should pass when at least one anyOf condition is satisfied', () => {
      const candidate = { value: 10, name: 'test' };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .anyOf((c) => c.value > 100) // false
        .anyOf((c) => c.value < 5) // false
        .anyOf((c) => c.name === 'test') // true
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should fail when all anyOf conditions fail', () => {
      const candidate = { value: 10, name: 'test' };
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .anyOf((c) => c.value > 100)
        .anyOf((c) => c.value < 5)
        .anyOf((c) => c.name === 'wrong')
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockIfSatisfied).not.toHaveBeenCalled();
      expect(mockOtherwise).toHaveBeenCalledWith(candidate);
    });

    it('should pass when multiple anyOf conditions are satisfied', () => {
      const candidate = { value: 10, name: 'test' };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .anyOf((c) => c.value > 5) // true
        .anyOf((c) => c.value < 15) // true
        .anyOf((c) => c.name === 'test') // true
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should return true when at least one anyOf condition is met', () => {
      const candidate = { value: 10 };

      const result = condition
        .on(candidate)
        .anyOf((c) => c.value === 5)
        .anyOf((c) => c.value === 10)
        .anyOf((c) => c.value === 15)
        .execute();

      expect(result).toBe(true);
    });

    it('should return false when no anyOf conditions are met', () => {
      const candidate = { value: 10 };

      const result = condition
        .on(candidate)
        .anyOf((c) => c.value === 5)
        .anyOf((c) => c.value === 15)
        .anyOf((c) => c.value === 20)
        .execute();

      expect(result).toBe(false);
    });
  });

  describe('Combined allOf and anyOf conditions', () => {
    it('should pass when both allOf and anyOf conditions are satisfied', () => {
      const candidate = { value: 10, name: 'test', active: true };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.active) // must be true
        .allOf((c) => c.value > 5) // must be true
        .anyOf((c) => c.name === 'test') // at least one must be true
        .anyOf((c) => c.value > 100)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should fail when allOf conditions pass but anyOf conditions fail', () => {
      const candidate = { value: 10, name: 'test', active: true };
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.active) // true
        .allOf((c) => c.value > 5) // true
        .anyOf((c) => c.name === 'wrong') // all false
        .anyOf((c) => c.value > 100)
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockIfSatisfied).not.toHaveBeenCalled();
      expect(mockOtherwise).toHaveBeenCalledWith(candidate);
    });

    it('should fail when anyOf conditions pass but allOf conditions fail', () => {
      const candidate = { value: 10, name: 'test', active: false };
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.active) // false
        .allOf((c) => c.value > 5) // true
        .anyOf((c) => c.name === 'test') // true
        .anyOf((c) => c.value === 10) // true
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockIfSatisfied).not.toHaveBeenCalled();
      expect(mockOtherwise).toHaveBeenCalledWith(candidate);
    });

    it('should pass with only anyOf conditions (no allOf)', () => {
      const candidate = { value: 10 };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .anyOf((c) => c.value > 5)
        .anyOf((c) => c.value < 15)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should pass with only allOf conditions (no anyOf)', () => {
      const candidate = { value: 10 };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.value > 5)
        .allOf((c) => c.value < 15)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });
  });

  describe('Edge cases', () => {
    it('should log error when no candidate is provided', () => {
      const mockAction = jest.fn();

      condition.ifSatisfied(mockAction).execute();

      expect(logger.error).toHaveBeenCalledWith(
        'No parameter for check, use on to specify parameter on which conditions needs to be checked'
      );
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle null candidate', () => {
      const mockAction = jest.fn();

      condition.on(null).ifSatisfied(mockAction).execute();

      expect(logger.error).toHaveBeenCalledWith(
        'No parameter for check, use on to specify parameter on which conditions needs to be checked'
      );
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle undefined candidate', () => {
      const mockAction = jest.fn();

      condition.on(undefined).ifSatisfied(mockAction).execute();

      expect(logger.error).toHaveBeenCalledWith(
        'No parameter for check, use on to specify parameter on which conditions needs to be checked'
      );
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should not fail when no actions are provided', () => {
      const candidate = { value: 10 };

      expect(() => {
        condition
          .on(candidate)
          .allOf((c) => c.value > 5)
          .execute();
      }).not.toThrow();
    });

    it('should not fail when gate conditions fail but no onMandatoryConditionFailure is provided', () => {
      const candidate = { value: 3 };
      const mockIfSatisfied = jest.fn();

      expect(() => {
        condition
          .on(candidate)
          .must((c) => c.value > 5)
          .ifSatisfied(mockIfSatisfied)
          .execute();
      }).not.toThrow();
    });

    it('should handle zero as a valid candidate value', () => {
      const candidate = 0;
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c === 0)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should handle empty string as a valid candidate value', () => {
      const candidate = '';
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c === '')
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should handle false as a valid candidate value', () => {
      const candidate = false;
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => !c)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle complex object with nested properties', () => {
      const candidate = {
        user: { name: 'John', age: 30 },
        permissions: ['read', 'write'],
      };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.user.age >= 18)
        .allOf((c) => c.permissions.includes('write'))
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should handle gate and normal conditions together', () => {
      const candidate = { value: 10, active: true };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .must((c) => c.active)
        .allOf((c) => c.value > 5)
        .allOf((c) => c.value < 15)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockGateFailure).not.toHaveBeenCalled();
      expect(mockIfSatisfied).toHaveBeenCalledWith(candidate);
      expect(mockOtherwise).not.toHaveBeenCalled();
    });

    it('should allow chaining multiple gate conditions', () => {
      const candidate = { value: 10, active: true, verified: true };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();

      condition
        .on(candidate)
        .must((c) => c.active)
        .must((c) => c.verified)
        .must((c) => c.value > 0)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .execute();

      expect(mockGateFailure).not.toHaveBeenCalled();
      expect(mockIfSatisfied).toHaveBeenCalledWith(candidate);
    });

    it('should work with array candidates', () => {
      const candidate = [1, 2, 3, 4, 5];
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c.length === 5)
        .allOf((c) => c.includes(3))
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should work with primitive candidates', () => {
      const candidate = 42;
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((c) => c > 40)
        .allOf((c) => c < 50)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });
  });

  describe('Builder pattern', () => {
    it('should allow method chaining', () => {
      const candidate = { value: 10 };
      const mockAction = jest.fn();

      const builder = condition
        .on(candidate)
        .must((c) => c.value > 0)
        .allOf((c) => c.value > 5)
        .allOf((c) => c.value < 15)
        .ifSatisfied(mockAction)
        .otherwise(jest.fn());

      expect(builder).toBeInstanceOf(Condition);
      builder.execute();
      expect(mockAction).toHaveBeenCalled();
    });

    it('should create a new instance when calling on()', () => {
      const candidate1 = { value: 10 };
      const candidate2 = { value: 20 };

      const builder1 = condition.on(candidate1);
      const builder2 = condition.on(candidate2);

      expect(builder1).toBeInstanceOf(Condition);
      expect(builder2).toBeInstanceOf(Condition);
      expect(builder1).not.toBe(builder2);
    });
  });

  describe('Type safety', () => {
    it('should work with strongly typed candidates', () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const candidate: User = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      };

      const mockAction = jest.fn();

      condition
        .on(candidate)
        .allOf((user) => user.id > 0)
        .allOf((user) => user.email.includes('@'))
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });
  });
});
