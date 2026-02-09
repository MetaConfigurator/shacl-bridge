import { KeyGenerator } from './key-generator';

describe('KeyGenerator', () => {
  let keyGenerator: KeyGenerator;

  beforeEach(() => {
    keyGenerator = new KeyGenerator();
  });

  describe('forRecord', () => {
    it('should generate root-relative key for $defs', () => {
      const key = keyGenerator.forRecord('root', '$defs', 'Person');
      expect(key).toBe('$defs/Person');
    });

    it('should generate root-relative key for definitions', () => {
      const key = keyGenerator.forRecord('root', 'definitions', 'Address');
      expect(key).toBe('definitions/Address');
    });

    it('should generate parent-relative key for properties', () => {
      const key = keyGenerator.forRecord('root', 'properties', 'name');
      expect(key).toBe('root/properties/name');
    });

    it('should generate parent-relative key for patternProperties', () => {
      const key = keyGenerator.forRecord('root', 'patternProperties', '^S_');
      expect(key).toBe('root/patternProperties/^S_');
    });

    it('should handle nested parent keys', () => {
      const key = keyGenerator.forRecord('root/properties/address', 'properties', 'street');
      expect(key).toBe('root/properties/address/properties/street');
    });
  });

  describe('forArrayItem', () => {
    it('should generate key with index for allOf', () => {
      const key = keyGenerator.forArrayItem('root', 'allOf', 0);
      expect(key).toBe('root/allOf/0');
    });

    it('should generate key with index for anyOf', () => {
      const key = keyGenerator.forArrayItem('root', 'anyOf', 2);
      expect(key).toBe('root/anyOf/2');
    });

    it('should generate key with index for oneOf', () => {
      const key = keyGenerator.forArrayItem('root', 'oneOf', 1);
      expect(key).toBe('root/oneOf/1');
    });

    it('should generate key with index for prefixItems', () => {
      const key = keyGenerator.forArrayItem('root', 'prefixItems', 3);
      expect(key).toBe('root/prefixItems/3');
    });

    it('should handle nested parent keys', () => {
      const key = keyGenerator.forArrayItem('root/properties/tags', 'allOf', 0);
      expect(key).toBe('root/properties/tags/allOf/0');
    });
  });

  describe('forValue', () => {
    it('should generate key for items', () => {
      const key = keyGenerator.forValue('root', 'items');
      expect(key).toBe('root/items');
    });

    it('should generate key for additionalProperties', () => {
      const key = keyGenerator.forValue('root', 'additionalProperties');
      expect(key).toBe('root/additionalProperties');
    });

    it('should generate key for not', () => {
      const key = keyGenerator.forValue('root', 'not');
      expect(key).toBe('root/not');
    });

    it('should handle nested parent keys', () => {
      const key = keyGenerator.forValue('root/properties/data', 'items');
      expect(key).toBe('root/properties/data/items');
    });

    it('should generate key for primitive values', () => {
      const key = keyGenerator.forValue('root', 'type');
      expect(key).toBe('root/type');
    });
  });
});
