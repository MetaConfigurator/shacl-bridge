import { DataFactory } from 'n3';
import { RDF_TYPE, SHACL_NODE_SHAPE } from '../../../src/shacl/shacl-terms';
import { EX, processSchema } from './test-utils';
import { JsonSchemaObjectType } from '../../../src/json-schema/meta/json-schema-type';

describe('NodeProcessor', () => {
  describe('root NodeShape suppression', () => {
    it('should not create a NodeShape for the root when it has only $defs and metadata', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        title: 'My Schema',
        description: 'A description',
        $defs: {
          Person: { type: 'object', properties: { name: { type: 'string' } } },
        },
      };

      const store = processSchema(schema);

      const rootTypeTerms = store.getObjects(
        DataFactory.namedNode(`${EX}Root`),
        DataFactory.namedNode(RDF_TYPE),
        null
      );
      expect(rootTypeTerms.some((t) => t.value === SHACL_NODE_SHAPE)).toBe(false);
    });

    it('should still create a NodeShape for the root when it has properties', () => {
      const schema: JsonSchemaObjectType = {
        $id: `${EX}Root`,
        title: 'My Schema',
        type: 'object',
        properties: { name: { type: 'string' } },
      };

      const store = processSchema(schema);

      const rootTypeTerms = store.getObjects(
        DataFactory.namedNode(`${EX}Root`),
        DataFactory.namedNode(RDF_TYPE),
        null
      );
      expect(rootTypeTerms.some((t) => t.value === SHACL_NODE_SHAPE)).toBe(true);
    });
  });
});
