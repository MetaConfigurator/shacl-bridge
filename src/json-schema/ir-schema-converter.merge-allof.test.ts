import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../ir/intermediate-representation-builder';
import { ShaclParser } from '../shacl/shacl-parser';
import { IrSchemaConverter } from './ir-schema-converter';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('IR Schema Converter - Merge allOf', () => {
  describe('Multiple $ref preservation', () => {
    it('real world usecase', async () => {
      const content = `
       @prefix sh:  <http://www.w3.org/ns/shacl#> .
@prefix ex:  <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

### Base shape: must have a name
ex:NamedShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:minLength 1 ;
    ] .

### Base shape: must have an email
ex:EmailRequiredShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:email ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:pattern "^[^@]+@[^@]+\\\\.[^@]+$" ;
    ] .

### Base shape: must have an age in a range
ex:AdultShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:age ;
        sh:datatype xsd:integer ;
        sh:minCount 1 ;
        sh:minInclusive 18 ;
        sh:maxInclusive 120 ;
    ] .

### Final shape: combines them all (ALL must hold)
ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:and (
        ex:NamedShape
        ex:EmailRequiredShape
        ex:AdultShape
    ) .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Adult: {
            additionalProperties: true,
            properties: {
              age: {
                items: {
                  type: 'integer',
                },
                maximum: 120,
                minItems: 1,
                minimum: 18,
                type: 'array',
              },
            },
            required: ['age'],
            title: 'Adult',
            type: 'object',
          },
          EmailRequired: {
            additionalProperties: true,
            properties: {
              email: {
                pattern: '^[^@]+@[^@]+\\.[^@]+$',
                type: 'string',
              },
            },
            required: ['email'],
            title: 'EmailRequired',
            type: 'object',
          },
          Named: {
            additionalProperties: true,
            properties: {
              name: {
                minLength: 1,
                type: 'string',
              },
            },
            required: ['name'],
            title: 'Named',
            type: 'object',
          },
          Person: {
            additionalProperties: true,
            allOf: [
              {
                $ref: '#/$defs/Named',
              },
              {
                $ref: '#/$defs/EmailRequired',
              },
              {
                $ref: '#/$defs/Adult',
              },
            ],
            title: 'Person',
            type: 'object',
          },
        },
        $id: 'http://example.org/NamedShape',
        $ref: '#/$defs/Named',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('allOf with multiple $ref entries', () => {
    it('should preserve allOf with multiple $ref entries', async () => {
      const content = `
@prefix sh:  <http://www.w3.org/ns/shacl#> .
@prefix ex:  <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:NamedShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
    ] .

ex:EmailShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:email ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
    ] .

ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:and (
        ex:NamedShape
        ex:EmailShape
    ) .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/NamedShape',
        $ref: '#/$defs/Named',
        $defs: {
          Person: {
            type: 'object',
            title: 'Person',
            additionalProperties: true,
            allOf: [{ $ref: '#/$defs/Named' }, { $ref: '#/$defs/Email' }],
          },
          Named: {
            type: 'object',
            title: 'Named',
            additionalProperties: true,
            properties: {
              name: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
            },
            required: ['name'],
          },
          Email: {
            type: 'object',
            title: 'Email',
            additionalProperties: true,
            properties: {
              email: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
            },
            required: ['email'],
          },
        },
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Nested anyOf flattening', () => {
    it('should not wrap anyOf inside not with extra anyOf', async () => {
      const content = `
@prefix sh:  <http://www.w3.org/ns/shacl#> .
@prefix ex:  <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:SafeMimeTypeShape
    a sh:NodeShape ;
    sh:targetClass ex:MimeType ;
    sh:property [
        sh:path ex:mimeType ;
        sh:datatype xsd:string ;
        sh:not [
            sh:or (
                [ sh:pattern "^application/x-.*" ]
                [ sh:pattern "^application/.*executable.*" ]
            )
        ]
    ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/SafeMimeTypeShape',
        $ref: '#/$defs/MimeType',
        $defs: {
          MimeType: {
            type: 'object',
            title: 'MimeType',
            additionalProperties: true,
            properties: {
              mimeType: {
                type: 'string',
                not: {
                  anyOf: [
                    { pattern: '^application/x-.*' },
                    { pattern: '^application/.*executable.*' },
                  ],
                },
              },
            },
          },
        },
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('anyOf with multiple $ref entries', () => {
    it('should preserve anyOf with multiple $ref entries for sh:or', async () => {
      const content = `
@prefix sh:  <http://www.w3.org/ns/shacl#> .
@prefix ex:  <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:StringShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:value ;
        sh:datatype xsd:string ;
    ] .

ex:IntegerShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:value ;
        sh:datatype xsd:integer ;
    ] .

ex:FlexibleShape
    a sh:NodeShape ;
    sh:targetClass ex:Flexible ;
    sh:or (
        ex:StringShape
        ex:IntegerShape
    ) .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      const flexibleDef = schema.$defs?.Flexible as { anyOf?: unknown[] };
      expect(flexibleDef.anyOf).toStrictEqual([
        { $ref: '#/$defs/String' },
        { $ref: '#/$defs/Integer' },
      ]);
    });
  });

  describe('oneOf with multiple $ref entries', () => {
    it('should preserve oneOf with multiple $ref entries for sh:xone', async () => {
      const content = `
@prefix sh:  <http://www.w3.org/ns/shacl#> .
@prefix ex:  <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:OptionAShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:optionA ;
        sh:datatype xsd:string ;
    ] .

ex:OptionBShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:optionB ;
        sh:datatype xsd:string ;
    ] .

ex:ExclusiveShape
    a sh:NodeShape ;
    sh:targetClass ex:Exclusive ;
    sh:xone (
        ex:OptionAShape
        ex:OptionBShape
    ) .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      const exclusiveDef = schema.$defs?.Exclusive as { oneOf?: unknown[] };
      expect(exclusiveDef.oneOf).toStrictEqual([
        { $ref: '#/$defs/OptionA' },
        { $ref: '#/$defs/OptionB' },
      ]);
    });
  });

  describe('not with named shape $ref', () => {
    it('should use $ref for sh:not with named shape', async () => {
      const content = `
@prefix sh:  <http://www.w3.org/ns/shacl#> .
@prefix ex:  <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:RestrictedShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:restricted ;
        sh:hasValue "forbidden" ;
    ] .

ex:AllowedShape
    a sh:NodeShape ;
    sh:targetClass ex:Allowed ;
    sh:not ex:RestrictedShape .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      const allowedDef = schema.$defs?.Allowed as { not?: unknown };
      expect(allowedDef.not).toStrictEqual({ $ref: '#/$defs/Restricted' });
    });
  });
});
