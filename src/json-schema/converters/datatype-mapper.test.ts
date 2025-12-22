import { DatatypeMapper } from './datatype-mapper';

describe('DatatypeMapper', () => {
  let mapper: DatatypeMapper;

  beforeEach(() => {
    mapper = new DatatypeMapper();
  });

  describe('XSD string types', () => {
    it('should map xsd:string to string type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#string');
      expect(result).toEqual({ type: 'string' });
    });

    it('should map xsd:normalizedString to string type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#normalizedString');
      expect(result).toEqual({ type: 'string' });
    });

    it('should map xsd:token to string type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#token');
      expect(result).toEqual({ type: 'string' });
    });
  });

  describe('XSD numeric types', () => {
    it('should map xsd:integer to integer type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#integer');
      expect(result).toEqual({ type: 'integer' });
    });

    it('should map xsd:int to integer type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#int');
      expect(result).toEqual({ type: 'integer' });
    });

    it('should map xsd:long to integer type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#long');
      expect(result).toEqual({ type: 'integer' });
    });

    it('should map xsd:short to integer type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#short');
      expect(result).toEqual({ type: 'integer' });
    });

    it('should map xsd:byte to integer type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#byte');
      expect(result).toEqual({ type: 'integer' });
    });

    it('should map xsd:nonNegativeInteger to integer with minimum 0', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#nonNegativeInteger');
      expect(result).toEqual({ type: 'integer', minimum: 0 });
    });

    it('should map xsd:positiveInteger to integer with minimum 1', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#positiveInteger');
      expect(result).toEqual({ type: 'integer', minimum: 1 });
    });

    it('should map xsd:nonPositiveInteger to integer with maximum 0', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#nonPositiveInteger');
      expect(result).toEqual({ type: 'integer', maximum: 0 });
    });

    it('should map xsd:negativeInteger to integer with maximum -1', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#negativeInteger');
      expect(result).toEqual({ type: 'integer', maximum: -1 });
    });

    it('should map xsd:decimal to number type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#decimal');
      expect(result).toEqual({ type: 'number' });
    });

    it('should map xsd:float to number type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#float');
      expect(result).toEqual({ type: 'number' });
    });

    it('should map xsd:double to number type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#double');
      expect(result).toEqual({ type: 'number' });
    });
  });

  describe('XSD boolean type', () => {
    it('should map xsd:boolean to boolean type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#boolean');
      expect(result).toEqual({ type: 'boolean' });
    });
  });

  describe('XSD date and time types', () => {
    it('should map xsd:date to string with date format', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#date');
      expect(result).toEqual({ type: 'string', format: 'date' });
    });

    it('should map xsd:dateTime to string with date-time format', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#dateTime');
      expect(result).toEqual({ type: 'string', format: 'date-time' });
    });

    it('should map xsd:time to string with time format', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#time');
      expect(result).toEqual({ type: 'string', format: 'time' });
    });

    it('should map xsd:duration to string with duration format', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#duration');
      expect(result).toEqual({ type: 'string', format: 'duration' });
    });

    it('should map xsd:gYear to string type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#gYear');
      expect(result).toEqual({ type: 'string' });
    });

    it('should map xsd:gYearMonth to string type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#gYearMonth');
      expect(result).toEqual({ type: 'string' });
    });
  });

  describe('XSD URI types', () => {
    it('should map xsd:anyURI to string with uri format', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#anyURI');
      expect(result).toEqual({ type: 'string', format: 'uri' });
    });
  });

  describe('XSD binary types', () => {
    it('should map xsd:base64Binary to string with contentEncoding', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#base64Binary');
      expect(result).toEqual({ type: 'string' });
    });

    it('should map xsd:hexBinary to string type', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#hexBinary');
      expect(result).toEqual({ type: 'string' });
    });
  });

  describe('unknown datatypes', () => {
    it('should return undefined for unknown datatype', () => {
      const result = mapper.map('http://example.org/unknown');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = mapper.map('');
      expect(result).toBeUndefined();
    });
  });

  describe('prefix handling', () => {
    it('should handle full XSD URI', () => {
      const result = mapper.map('http://www.w3.org/2001/XMLSchema#string');
      expect(result).toEqual({ type: 'string' });
    });
  });
});
