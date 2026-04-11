import { ShaclMapper } from '../../../../src/shacl/tree-processor/mapper/shacl-mapper';
import { JsonSchemaObjectType } from '../../../../src/json-schema/meta/json-schema-type';
import {
  SHACL_DATATYPE,
  SHACL_MAX_LENGTH,
  SHACL_MIN_LENGTH,
  SHACL_NAME,
  SHACL_PATTERN,
  XSD_STRING,
} from '../../../../src/shacl/shacl-terms';
import { buildStore, EX, getBlankObject, getObject } from '../test-utils';

function buildAndGetStore(schema: JsonSchemaObjectType, subject: string, isBlank = false) {
  return buildStore(`${EX}Root`, (context) => {
    new ShaclMapper(context).map(schema, subject, isBlank);
  });
}

describe('ShaclMapper', () => {
  describe('blank node subject', () => {
    it('should map constraints to blank node when isBlank is true', () => {
      const store = buildAndGetStore({ type: 'string', minLength: 1 }, 'prop_0', true);

      expect(getBlankObject(store, 'prop_0', SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getBlankObject(store, 'prop_0', SHACL_MIN_LENGTH)).toBe('1');
    });
  });

  describe('multiple constraints', () => {
    it('should map all constraints from a schema', () => {
      const schema: JsonSchemaObjectType = {
        title: 'Name',
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[A-Za-z]+$',
      };

      const store = buildAndGetStore(schema, `${EX}Shape`);

      expect(getObject(store, `${EX}Shape`, SHACL_NAME)).toBe('Name');
      expect(getObject(store, `${EX}Shape`, SHACL_DATATYPE)).toBe(XSD_STRING);
      expect(getObject(store, `${EX}Shape`, SHACL_MIN_LENGTH)).toBe('1');
      expect(getObject(store, `${EX}Shape`, SHACL_MAX_LENGTH)).toBe('100');
      expect(getObject(store, `${EX}Shape`, SHACL_PATTERN)).toBe('^[A-Za-z]+$');
    });
  });
});
