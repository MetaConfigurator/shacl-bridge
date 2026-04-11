import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import {
  SHACL_DATATYPE,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_MIN_LENGTH,
  SHACL_NODE,
  SHACL_PATH,
  SHACL_PROPERTY,
  XSD_STRING,
} from '../../../../src/shacl/shacl-terms';
import { EX, getBlankObject, getObjectTerms, processSchema } from '../test-utils';

describe('PropertyEdgeProcessor', () => {
  describe('basic property shapes', () => {
    it('should create property shape with sh:path', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: { name: { type: 'string' } },
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(propertyTerms).toHaveLength(1);
      expect(getBlankObject(store, propertyTerms[0], SHACL_PATH)).toBe(`${EX}name`);
    });

    it('should add sh:minCount 1 for required properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(getBlankObject(store, propertyTerms[0], SHACL_MIN_COUNT)).toBe('1');
    });

    it('should map property constraints to blank node', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: { name: { type: 'string', minLength: 1 } },
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(getBlankObject(store, propertyTerms[0], SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getBlankObject(store, propertyTerms[0], SHACL_MIN_LENGTH)).toBe('1');
    });

    it('should handle property with $ref', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        $defs: { NameType: { type: 'string' } },
        properties: { name: { $ref: '#/$defs/NameType' } },
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY);
      expect(getBlankObject(store, propertyTerms[0], SHACL_NODE)).toBe(`${EX}NameType`);
    });

    it('should handle multiple properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}PersonShape`,
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };
      const store = processSchema(schema);

      expect(getObjectTerms(store, `${EX}PersonShape`, SHACL_PROPERTY)).toHaveLength(2);
    });
  });

  describe('array property constraints', () => {
    it('should emit minItems/maxItems on property shape when items is a $ref', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}CourseShape`,
        $defs: { Person: { type: 'object' } },
        type: 'object',
        properties: {
          instructors: {
            type: 'array',
            items: { $ref: '#/$defs/Person' },
            minItems: 1,
            maxItems: 5,
          },
        },
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}CourseShape`, SHACL_PROPERTY);
      expect(propertyTerms).toHaveLength(1);
      expect(getBlankObject(store, propertyTerms[0], SHACL_MIN_COUNT)).toBe('1');
      expect(getBlankObject(store, propertyTerms[0], SHACL_MAX_COUNT)).toBe('5');
      expect(getBlankObject(store, propertyTerms[0], SHACL_NODE)).toBe(`${EX}Person`);
    });

    it('should emit minItems/maxItems on property shape when items has inline constraints', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}ListShape`,
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 10,
          },
        },
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}ListShape`, SHACL_PROPERTY);
      expect(getBlankObject(store, propertyTerms[0], SHACL_MIN_COUNT)).toBe('2');
      expect(getBlankObject(store, propertyTerms[0], SHACL_MAX_COUNT)).toBe('10');
    });
  });

  describe('required without properties', () => {
    it('should create property shapes for required fields with no corresponding properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        required: ['advisor'],
      };
      const store = processSchema(schema);

      const propertyTerms = getObjectTerms(store, `${EX}Shape`, SHACL_PROPERTY);
      expect(propertyTerms).toHaveLength(1);
      expect(getBlankObject(store, propertyTerms[0], SHACL_PATH)).toBe(`${EX}advisor`);
      expect(getBlankObject(store, propertyTerms[0], SHACL_MIN_COUNT)).toBe('1');
    });

    it('should not double-emit property shapes for required fields that also appear in properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Shape`,
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const store = processSchema(schema);

      expect(getObjectTerms(store, `${EX}Shape`, SHACL_PROPERTY)).toHaveLength(1);
    });
  });
});
