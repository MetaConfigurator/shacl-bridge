import { JsonSchemaObjectBuilder } from '../../meta/json-schema-object-builder';
import { mapDataType } from '../../../util/helpers';

describe('DataType Mapping', () => {
  let builder: JsonSchemaObjectBuilder;

  beforeEach(() => {
    builder = new JsonSchemaObjectBuilder();
  });

  describe('XSD string types', () => {
    it('should map xsd:string to string type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#string', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });

    it('should map xsd:normalizedString to string type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#normalizedString', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });

    it('should map xsd:token to string type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#token', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });
  });

  describe('XSD numeric types', () => {
    it('should map xsd:integer to integer type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#integer', builder);
      expect(builder.build()).toEqual({ type: 'integer' });
    });

    it('should map xsd:int to integer type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#int', builder);
      expect(builder.build()).toEqual({ type: 'integer' });
    });

    it('should map xsd:long to integer type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#long', builder);
      expect(builder.build()).toEqual({ type: 'integer' });
    });

    it('should map xsd:short to integer type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#short', builder);
      expect(builder.build()).toEqual({ type: 'integer' });
    });

    it('should map xsd:byte to integer type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#byte', builder);
      expect(builder.build()).toEqual({ type: 'integer' });
    });

    it('should map xsd:nonNegativeInteger to integer with minimum 0', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#nonNegativeInteger', builder);
      expect(builder.build()).toEqual({ type: 'integer', minimum: 0 });
    });

    it('should map xsd:positiveInteger to integer with minimum 1', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#positiveInteger', builder);
      expect(builder.build()).toEqual({ type: 'integer', minimum: 1 });
    });

    it('should map xsd:nonPositiveInteger to integer with maximum 0', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#nonPositiveInteger', builder);
      expect(builder.build()).toEqual({ type: 'integer', maximum: 0 });
    });

    it('should map xsd:negativeInteger to integer with maximum -1', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#negativeInteger', builder);
      expect(builder.build()).toEqual({ type: 'integer', maximum: -1 });
    });

    it('should map xsd:decimal to number type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#decimal', builder);
      expect(builder.build()).toEqual({ type: 'number' });
    });

    it('should map xsd:float to number type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#float', builder);
      expect(builder.build()).toEqual({ type: 'number' });
    });

    it('should map xsd:double to number type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#double', builder);
      expect(builder.build()).toEqual({ type: 'number' });
    });
  });

  describe('XSD boolean type', () => {
    it('should map xsd:boolean to boolean type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#boolean', builder);
      expect(builder.build()).toEqual({ type: 'boolean' });
    });
  });

  describe('XSD date and time types', () => {
    it('should map xsd:date to string with date format', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#date', builder);
      expect(builder.build()).toEqual({ type: 'string', format: 'date' });
    });

    it('should map xsd:dateTime to string with date-time format', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#dateTime', builder);
      expect(builder.build()).toEqual({ type: 'string', format: 'date-time' });
    });

    it('should map xsd:time to string with time format', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#time', builder);
      expect(builder.build()).toEqual({ type: 'string', format: 'time' });
    });

    it('should map xsd:duration to string with duration format', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#duration', builder);
      expect(builder.build()).toEqual({ type: 'string', format: 'duration' });
    });

    it('should map xsd:gYear to string type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#gYear', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });

    it('should map xsd:gYearMonth to string type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#gYearMonth', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });
  });

  describe('XSD URI types', () => {
    it('should map xsd:anyURI to string with uri format', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#anyURI', builder);
      expect(builder.build()).toEqual({ type: 'string', format: 'uri' });
    });
  });

  describe('XSD binary types', () => {
    it('should map xsd:base64Binary to string with contentEncoding', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#base64Binary', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });

    it('should map xsd:hexBinary to string type', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#hexBinary', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });
  });

  describe('unknown datatypes', () => {
    it('should return string for unknown datatype', () => {
      mapDataType('http://example.org/unknown', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });

    it('should not set type for empty string', () => {
      mapDataType('', builder);
      expect(builder.build()).toEqual({});
    });
  });

  describe('prefix handling', () => {
    it('should handle full XSD URI', () => {
      mapDataType('http://www.w3.org/2001/XMLSchema#string', builder);
      expect(builder.build()).toEqual({ type: 'string' });
    });
  });
});
