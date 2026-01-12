jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

import { Condition } from './condition';
import logger from '../logger';

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
        .have((c) => c.value > 5)
        .have((c) => c.value < 15)
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
        .have((c) => c.value > 5)
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
        .always((c) => c.value > 5)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .execute();

      expect(logger.error).toHaveBeenCalledWith('Mandatory condition failed.');
      expect(mockGateFailure).toHaveBeenCalledWith(candidate);
      expect(mockIfSatisfied).toHaveBeenCalledWith(candidate);
    });

    it('should execute normal flow when gate conditions pass', () => {
      const candidate = { value: 10 };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();

      condition
        .on(candidate)
        .always((c) => c.value > 5)
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
        .always((c) => c.value > 5)
        .always((c) => c.value < 8)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .execute();

      expect(logger.error).toHaveBeenCalledWith('Mandatory condition failed.');
      expect(mockGateFailure).toHaveBeenCalledWith(candidate);
    });

    it('should still evaluate normal conditions even when gate conditions fail', () => {
      const candidate = { value: 3 };
      const mockGateFailure = jest.fn();
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .always((c) => c.value > 10)
        .have((c) => c.value < 5)
        .onMandatoryConditionFailure(mockGateFailure)
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockGateFailure).toHaveBeenCalledWith(candidate);
      expect(mockIfSatisfied).toHaveBeenCalledWith(candidate);
      expect(mockOtherwise).not.toHaveBeenCalled();
    });
  });

  describe('Multiple conditions', () => {
    it('should pass when all normal conditions are satisfied', () => {
      const candidate = { value: 10, name: 'test' };
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .have((c) => c.value > 5)
        .have((c) => c.value < 15)
        .have((c) => c.name === 'test')
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should fail when any normal condition fails', () => {
      const candidate = { value: 10, name: 'test' };
      const mockIfSatisfied = jest.fn();
      const mockOtherwise = jest.fn();

      condition
        .on(candidate)
        .have((c) => c.value > 5)
        .have((c) => c.value < 15)
        .have((c) => c.name === 'wrong')
        .ifSatisfied(mockIfSatisfied)
        .otherwise(mockOtherwise)
        .execute();

      expect(mockIfSatisfied).not.toHaveBeenCalled();
      expect(mockOtherwise).toHaveBeenCalledWith(candidate);
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
          .have((c) => c.value > 5)
          .execute();
      }).not.toThrow();
    });

    it('should not fail when gate conditions fail but no onMandatoryConditionFailure is provided', () => {
      const candidate = { value: 3 };
      const mockIfSatisfied = jest.fn();

      expect(() => {
        condition
          .on(candidate)
          .always((c) => c.value > 5)
          .ifSatisfied(mockIfSatisfied)
          .execute();
      }).not.toThrow();

      expect(logger.error).toHaveBeenCalledWith('Mandatory condition failed.');
    });

    it('should handle zero as a valid candidate value', () => {
      const candidate = 0;
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .have((c) => c === 0)
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should handle empty string as a valid candidate value', () => {
      const candidate = '';
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .have((c) => c === '')
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should handle false as a valid candidate value', () => {
      const candidate = false;
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .have((c) => !c)
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
        .have((c) => c.user.age >= 18)
        .have((c) => c.permissions.includes('write'))
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
        .always((c) => c.active)
        .have((c) => c.value > 5)
        .have((c) => c.value < 15)
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
        .always((c) => c.active)
        .always((c) => c.verified)
        .always((c) => c.value > 0)
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
        .have((c) => c.length === 5)
        .have((c) => c.includes(3))
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });

    it('should work with primitive candidates', () => {
      const candidate = 42;
      const mockAction = jest.fn();

      condition
        .on(candidate)
        .have((c) => c > 40)
        .have((c) => c < 50)
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
        .always((c) => c.value > 0)
        .have((c) => c.value > 5)
        .have((c) => c.value < 15)
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
        .have((user) => user.id > 0)
        .have((user) => user.email.includes('@'))
        .ifSatisfied(mockAction)
        .execute();

      expect(mockAction).toHaveBeenCalledWith(candidate);
    });
  });
});
