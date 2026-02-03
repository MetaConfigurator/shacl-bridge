import { ShaclWriter } from './shacl-writer';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';

const DEFAULT_PREFIXES: Record<string, string> = {
  sh: 'http://www.w3.org/ns/shacl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  ex: 'http://example.org/',
};

async function toShacl(schema: JsonSchemaObjectType): Promise<string> {
  return new ShaclWriter(schema).getStoreBuilder().withPrefixes(DEFAULT_PREFIXES).write();
}

function normalizeWhitespace(str: string): string {
  return str
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('@prefix'))
    .filter((line) => line.length > 0)
    .join('\n');
}

describe('ShaclWriter Integration', () => {
  describe('simple string shape', () => {
    it('should convert string type with constraints', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/NameShape',
        title: 'Name Shape',
        description: 'A shape for validating names',
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[A-Za-z]+$',
      };

      const shacl = await toShacl(schema);

      expect(normalizeWhitespace(shacl)).toBe(
        normalizeWhitespace(`
          ex:NameShape a sh:NodeShape;
              sh:name "Name Shape";
              sh:description "A shape for validating names";
              sh:datatype xsd:string;
              sh:minLength 1;
              sh:maxLength 100;
              sh:pattern "^[A-Za-z]+$".
        `)
      );
    });
  });

  describe('simple integer shape', () => {
    it('should convert integer type with numeric constraints', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/AgeShape',
        type: 'integer',
        minimum: 0,
        maximum: 150,
      };

      const shacl = await toShacl(schema);

      expect(normalizeWhitespace(shacl)).toBe(
        normalizeWhitespace(`
          ex:AgeShape a sh:NodeShape;
              sh:datatype xsd:integer;
              sh:minInclusive 0;
              sh:maxInclusive 150.
        `)
      );
    });
  });

  describe('object with properties', () => {
    it('should convert object with single property', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/PersonShape',
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const shacl = await toShacl(schema);

      expect(normalizeWhitespace(shacl)).toBe(
        normalizeWhitespace(`
          ex:PersonShape a sh:NodeShape;
              sh:nodeKind sh:BlankNodeOrIRI;
              sh:property _:b0.
          _:b0 sh:path ex:name;
              sh:maxCount 1;
              sh:datatype xsd:string.
        `)
      );
    });

    it('should convert object with required property', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/PersonShape',
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const shacl = await toShacl(schema);

      expect(normalizeWhitespace(shacl)).toBe(
        normalizeWhitespace(`
          ex:PersonShape a sh:NodeShape;
              sh:nodeKind sh:BlankNodeOrIRI;
              sh:property _:b0.
          _:b0 sh:path ex:name;
              sh:minCount 1;
              sh:maxCount 1;
              sh:datatype xsd:string.
        `)
      );
    });

    it('should convert object with multiple properties', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/PersonShape',
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        required: ['name'],
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:property');
      expect(shacl).toContain('_:b0');
      expect(shacl).toContain('_:b1');
      expect(shacl).toContain('sh:path ex:name');
      expect(shacl).toContain('sh:path ex:age');
      expect(shacl).toContain('sh:datatype xsd:string');
      expect(shacl).toContain('sh:datatype xsd:integer');
    });
  });

  describe('closed shape', () => {
    it('should convert closed object', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/StrictShape',
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        additionalProperties: false,
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:closed true');
    });
  });

  describe('$defs and references', () => {
    it('should convert schema with $defs', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/Root',
        $defs: {
          NameType: {
            type: 'string',
            minLength: 1,
          },
        },
        type: 'object',
        properties: {
          name: { $ref: '#/$defs/NameType' },
        },
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('ex:NameType a sh:NodeShape');
      expect(shacl).toContain('sh:targetClass ex:NameType');
      expect(shacl).toContain('sh:datatype xsd:string');
      expect(shacl).toContain('sh:minLength 1');
      expect(shacl).toContain('sh:node ex:NameType');
    });
  });

  describe('enum values', () => {
    it('should convert enum to sh:in list', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/StatusShape',
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:in');
      expect(shacl).toContain('"active"');
      expect(shacl).toContain('"inactive"');
      expect(shacl).toContain('"pending"');
    });
  });

  describe('const value', () => {
    it('should convert const to sh:hasValue', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/FixedShape',
        const: 'fixed-value',
      };

      const shacl = await toShacl(schema);

      expect(normalizeWhitespace(shacl)).toBe(
        normalizeWhitespace(`
          ex:FixedShape a sh:NodeShape;
              sh:hasValue "fixed-value".
        `)
      );
    });
  });

  describe('logical operators', () => {
    it('should convert allOf to sh:and', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/CombinedShape',
        $defs: {
          StringType: { type: 'string' },
          NonEmpty: { minLength: 1 },
        },
        allOf: [{ $ref: '#/$defs/StringType' }, { $ref: '#/$defs/NonEmpty' }],
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:and');
      expect(shacl).toContain('ex:StringType');
      expect(shacl).toContain('ex:NonEmpty');
    });

    it('should convert anyOf to sh:or', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/UnionShape',
        $defs: {
          StringType: { type: 'string' },
          NumberType: { type: 'number' },
        },
        anyOf: [{ $ref: '#/$defs/StringType' }, { $ref: '#/$defs/NumberType' }],
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:or');
      expect(shacl).toContain('ex:StringType');
      expect(shacl).toContain('ex:NumberType');
    });

    it('should convert oneOf to sh:xone', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/ExclusiveShape',
        $defs: {
          OptionA: { const: 'a' },
          OptionB: { const: 'b' },
        },
        oneOf: [{ $ref: '#/$defs/OptionA' }, { $ref: '#/$defs/OptionB' }],
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:xone');
      expect(shacl).toContain('ex:OptionA');
      expect(shacl).toContain('ex:OptionB');
    });

    it('should convert not to sh:not', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/NotNullShape',
        $defs: {
          NullType: { type: 'null' },
        },
        not: { $ref: '#/$defs/NullType' },
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:not ex:NullType');
    });
  });

  describe('complex schema', () => {
    it('should convert a realistic person schema', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/PersonShape',
        title: 'Person',
        description: 'A person entity',
        type: 'object',
        $defs: {
          Email: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
        },
        properties: {
          name: { type: 'string', minLength: 1 },
          age: { type: 'integer', minimum: 0, maximum: 150 },
          email: { $ref: '#/$defs/Email' },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
        required: ['name', 'email'],
        additionalProperties: false,
      };

      const shacl = await toShacl(schema);

      // Verify main shape
      expect(shacl).toContain('ex:PersonShape');
      expect(shacl).toContain('sh:name "Person"');
      expect(shacl).toContain('sh:description "A person entity"');
      expect(shacl).toContain('sh:nodeKind sh:BlankNodeOrIRI');
      expect(shacl).toContain('sh:closed true');

      // Verify Email definition
      expect(shacl).toContain('ex:Email a sh:NodeShape');
      expect(shacl).toContain('sh:targetClass ex:Email');
      expect(shacl).toContain('sh:pattern');

      // Verify properties
      expect(shacl).toContain('sh:path ex:name');
      expect(shacl).toContain('sh:path ex:age');
      expect(shacl).toContain('sh:path ex:email');
      expect(shacl).toContain('sh:path ex:status');

      // Verify property constraints
      expect(shacl).toContain('sh:node ex:Email');
      expect(shacl).toContain('sh:in');
    });
  });

  describe('array with items', () => {
    it('should convert array items reference to sh:node', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/ListShape',
        type: 'array',
        $defs: {
          ItemType: { type: 'string' },
        },
        items: { $ref: '#/$defs/ItemType' },
        minItems: 1,
        maxItems: 10,
      };

      const shacl = await toShacl(schema);

      expect(shacl).toContain('sh:node ex:ItemType');
      expect(shacl).toContain('sh:minCount 1');
      expect(shacl).toContain('sh:maxCount 10');
    });
  });

  describe('exclusive numeric constraints', () => {
    it('should convert exclusive min/max', async () => {
      const schema: JsonSchemaObjectType = {
        $id: 'http://example.org/RangeShape',
        type: 'number',
        exclusiveMinimum: 0,
        exclusiveMaximum: 100,
      };

      const shacl = await toShacl(schema);

      expect(normalizeWhitespace(shacl)).toBe(
        normalizeWhitespace(`
          ex:RangeShape a sh:NodeShape;
              sh:datatype xsd:decimal;
              sh:minExclusive 0;
              sh:maxExclusive 100.
        `)
      );
    });
  });
});
