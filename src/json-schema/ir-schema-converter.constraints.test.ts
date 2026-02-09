import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../ir/intermediate-representation-builder';
import { ShaclParser } from '../shacl/parser/shacl-parser';
import { IrSchemaConverter } from './ir-schema-converter';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('IR Schema Converter - Constraints', () => {
  describe('Logical Constraints', () => {
    it('should handle sh:or mapping to anyOf', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FlexibleShape
            a sh:NodeShape ;
            sh:targetClass ex:FlexibleType ;
            sh:property [
                sh:path ex:identifier ;
                sh:or (
                    [ sh:datatype xsd:string ; sh:minLength 5 ]
                    [ sh:datatype xsd:integer ; sh:minInclusive 1000 ]
                )
            ] ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          FlexibleType: {
            additionalProperties: true,
            properties: {
              identifier: {
                anyOf: [
                  {
                    minLength: 5,
                    type: 'string',
                  },
                  {
                    minimum: 1000,
                    type: 'integer',
                  },
                ],
              },
              name: {
                type: 'string',
              },
            },
            title: 'FlexibleType',
            type: 'object',
          },
        },
        $id: 'http://example.org/FlexibleShape',
        $ref: '#/$defs/FlexibleType',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:and mapping to allOf', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RestrictedShape
            a sh:NodeShape ;
            sh:targetClass ex:RestrictedType ;
            sh:property [
                sh:path ex:code ;
                sh:and (
                    [ sh:datatype xsd:string ; sh:pattern "^[A-Z]{3}$" ]
                    [ sh:minLength 3 ; sh:maxLength 3 ]
                )
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          RestrictedType: {
            additionalProperties: true,
            properties: {
              code: {
                allOf: [
                  {
                    pattern: '^[A-Z]{3}$',
                    type: 'string',
                  },
                  {
                    maxLength: 3,
                    minLength: 3,
                  },
                ],
              },
            },
            title: 'RestrictedType',
            type: 'object',
          },
        },
        $id: 'http://example.org/RestrictedShape',
        $ref: '#/$defs/RestrictedType',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:xone mapping to oneOf', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ExclusiveShape
            a sh:NodeShape ;
            sh:targetClass ex:ExclusiveType ;
            sh:property [
                sh:path ex:contact ;
                sh:xone (
                    [ sh:datatype xsd:string ; sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ]
                    [ sh:datatype xsd:string ; sh:pattern "^\\\\+?[1-9]\\\\d{1,14}$" ]
                )
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ExclusiveType: {
            additionalProperties: true,
            properties: {
              contact: {
                oneOf: [
                  {
                    pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
                    type: 'string',
                  },
                  {
                    pattern: '^\\+?[1-9]\\d{1,14}$',
                    type: 'string',
                  },
                ],
              },
            },
            title: 'ExclusiveType',
            type: 'object',
          },
        },
        $id: 'http://example.org/ExclusiveShape',
        $ref: '#/$defs/ExclusiveType',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:not mapping to not', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:NegativeShape
            a sh:NodeShape ;
            sh:targetClass ex:NegativeType ;
            sh:property [
                sh:path ex:username ;
                sh:datatype xsd:string ;
                sh:not [
                    sh:pattern "^admin.*"
                ]
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          NegativeType: {
            additionalProperties: true,
            properties: {
              username: {
                not: {
                  pattern: '^admin.*',
                },
                type: 'string',
              },
            },
            title: 'NegativeType',
            type: 'object',
          },
        },
        $id: 'http://example.org/NegativeShape',
        $ref: '#/$defs/NegativeType',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle nested logical operators', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ComplexLogicShape
            a sh:NodeShape ;
            sh:targetClass ex:ComplexType ;
            sh:property [
                sh:path ex:value ;
                sh:or (
                    [
                        sh:and (
                            [ sh:datatype xsd:string ]
                            [ sh:minLength 10 ]
                        )
                    ]
                    [
                        sh:and (
                            [ sh:datatype xsd:integer ]
                            [ sh:minInclusive 0 ; sh:maxInclusive 100 ]
                        )
                    ]
                )
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ComplexType: {
            additionalProperties: true,
            properties: {
              value: {
                anyOf: [
                  {
                    allOf: [
                      {
                        type: 'string',
                      },
                      {
                        minLength: 10,
                      },
                    ],
                  },
                  {
                    allOf: [
                      {
                        type: 'integer',
                      },
                      {
                        maximum: 100,
                        minimum: 0,
                      },
                    ],
                  },
                ],
              },
            },
            title: 'ComplexType',
            type: 'object',
          },
        },
        $id: 'http://example.org/ComplexLogicShape',
        $ref: '#/$defs/ComplexType',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle logical operators with object references', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PaymentShape
            a sh:NodeShape ;
            sh:targetClass ex:Payment ;
            sh:property [
                sh:path ex:method ;
                sh:xone (
                    [ sh:node ex:CreditCardShape ]
                    [ sh:node ex:BankTransferShape ]
                    [ sh:node ex:PayPalShape ]
                )
            ] .

        ex:CreditCardShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:cardNumber ;
                sh:datatype xsd:string ;
                sh:pattern "^[0-9]{16}$" ;
            ] .

        ex:BankTransferShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:iban ;
                sh:datatype xsd:string ;
            ] .

        ex:PayPalShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          BankTransfer: {
            additionalProperties: true,
            properties: {
              iban: {
                type: 'string',
              },
            },
            title: 'BankTransfer',
            type: 'object',
          },
          CreditCard: {
            additionalProperties: true,
            properties: {
              cardNumber: {
                pattern: '^[0-9]{16}$',
                type: 'string',
              },
            },
            title: 'CreditCard',
            type: 'object',
          },
          PayPal: {
            additionalProperties: true,
            properties: {
              email: {
                type: 'string',
              },
            },
            title: 'PayPal',
            type: 'object',
          },
          Payment: {
            additionalProperties: true,
            properties: {
              method: {
                oneOf: [
                  {
                    $ref: '#/$defs/CreditCard',
                  },
                  {
                    $ref: '#/$defs/BankTransfer',
                  },
                  {
                    $ref: '#/$defs/PayPal',
                  },
                ],
              },
            },
            title: 'Payment',
            type: 'object',
          },
        },
        $id: 'http://example.org/PaymentShape',
        $ref: '#/$defs/Payment',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('String Constraint Combinations', () => {
    it('should handle username with minLength, maxLength, and pattern', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:AccountShape
            a sh:NodeShape ;
            sh:targetClass ex:Account ;
            sh:property [
                sh:path ex:username ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
                sh:maxLength 20 ;
                sh:pattern "^[a-zA-Z0-9_-]+$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Account: {
            additionalProperties: true,
            properties: {
              username: {
                maxLength: 20,
                minLength: 3,
                pattern: '^[a-zA-Z0-9_-]+$',
                type: 'string',
              },
            },
            required: ['username'],
            title: 'Account',
            type: 'object',
          },
        },
        $id: 'http://example.org/AccountShape',
        $ref: '#/$defs/Account',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle email with complex regex pattern', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContactShape
            a sh:NodeShape ;
            sh:targetClass ex:Contact ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$" ;
                sh:maxLength 254 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Contact: {
            additionalProperties: true,
            properties: {
              email: {
                maxLength: 254,
                pattern:
                  "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
                type: 'string',
              },
            },
            title: 'Contact',
            type: 'object',
          },
        },
        $id: 'http://example.org/ContactShape',
        $ref: '#/$defs/Contact',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle URL with validation pattern', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:WebResourceShape
            a sh:NodeShape ;
            sh:targetClass ex:WebResource ;
            sh:property [
                sh:path ex:url ;
                sh:datatype xsd:string ;
                sh:pattern "^https?://[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}(/.*)?$" ;
                sh:minLength 10 ;
                sh:maxLength 2048 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          WebResource: {
            additionalProperties: true,
            properties: {
              url: {
                maxLength: 2048,
                minLength: 10,
                pattern: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$',
                type: 'string',
              },
            },
            required: ['url'],
            title: 'WebResource',
            type: 'object',
          },
        },
        $id: 'http://example.org/WebResourceShape',
        $ref: '#/$defs/WebResource',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle UUID with strict pattern validation', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ResourceShape
            a sh:NodeShape ;
            sh:targetClass ex:Resource ;
            sh:property [
                sh:path ex:id ;
                sh:datatype xsd:string ;
                sh:pattern "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" ;
                sh:minLength 36 ;
                sh:maxLength 36 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Resource: {
            additionalProperties: true,
            properties: {
              id: {
                maxLength: 36,
                minLength: 36,
                pattern:
                  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
                type: 'string',
              },
            },
            required: ['id'],
            title: 'Resource',
            type: 'object',
          },
        },
        $id: 'http://example.org/ResourceShape',
        $ref: '#/$defs/Resource',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Value Range Constraints', () => {
    it('should handle numeric range with minInclusive and maxInclusive', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TemperatureShape
            a sh:NodeShape ;
            sh:targetClass ex:Sensor ;
            sh:property [
                sh:path ex:temperature ;
                sh:datatype xsd:decimal ;
                sh:minInclusive -273.15 ;
                sh:maxInclusive 1000.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Sensor: {
            title: 'Sensor',
            type: 'object',
            properties: {
              temperature: {
                type: 'number',
                minimum: -273.15,
                maximum: 1000.0,
              },
            },
            required: ['temperature'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/TemperatureShape',
        $ref: '#/$defs/Sensor',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle numeric range with minExclusive and maxExclusive', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PercentageShape
            a sh:NodeShape ;
            sh:targetClass ex:Statistics ;
            sh:property [
                sh:path ex:rate ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:maxExclusive 100.0 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Statistics: {
            title: 'Statistics',
            type: 'object',
            properties: {
              rate: {
                type: 'number',
                exclusiveMinimum: 0.0,
                exclusiveMaximum: 100.0,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PercentageShape',
        $ref: '#/$defs/Statistics',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle mixed inclusive and exclusive bounds', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ScoreShape
            a sh:NodeShape ;
            sh:targetClass ex:TestResult ;
            sh:property [
                sh:path ex:score ;
                sh:datatype xsd:integer ;
                sh:minInclusive 0 ;
                sh:maxExclusive 100 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          TestResult: {
            title: 'TestResult',
            type: 'object',
            properties: {
              score: {
                type: 'integer',
                minimum: 0,
                exclusiveMaximum: 100,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ScoreShape',
        $ref: '#/$defs/TestResult',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle date ranges with minInclusive and maxInclusive (filtered out)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EventShape
            a sh:NodeShape ;
            sh:targetClass ex:Event ;
            sh:property [
                sh:path ex:eventDate ;
                sh:datatype xsd:date ;
                sh:minInclusive "2020-01-01"^^xsd:date ;
                sh:maxInclusive "2030-12-31"^^xsd:date ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: min/max constraints are filtered out for date types
      // because JSON Schema minimum/maximum only apply to numeric types
      expect(schema).toStrictEqual({
        $defs: {
          Event: {
            title: 'Event',
            type: 'object',
            properties: {
              eventDate: {
                type: 'string',
                format: 'date',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/EventShape',
        $ref: '#/$defs/Event',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle zero and negative boundary conditions', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:BalanceShape
            a sh:NodeShape ;
            sh:targetClass ex:Account ;
            sh:property [
                sh:path ex:balance ;
                sh:datatype xsd:decimal ;
                sh:minInclusive -1000.0 ;
                sh:maxInclusive 0.0 ;
            ] ;
            sh:property [
                sh:path ex:creditScore ;
                sh:datatype xsd:integer ;
                sh:minExclusive -1 ;
                sh:maxInclusive 850 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Account: {
            title: 'Account',
            type: 'object',
            properties: {
              balance: {
                type: 'number',
                minimum: -1000.0,
                maximum: 0.0,
              },
              creditScore: {
                type: 'integer',
                exclusiveMinimum: -1,
                maximum: 850,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/BalanceShape',
        $ref: '#/$defs/Account',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Property Pair Constraints', () => {
    it('should handle sh:equals constraint (not directly supported in JSON Schema)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:confirmEmail ;
                sh:datatype xsd:string ;
                sh:equals ex:email ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:equals has no direct JSON Schema equivalent
      // Preserved as x-shacl-equals extension
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              email: {
                type: 'string',
              },
              confirmEmail: {
                type: 'string',
                'x-shacl-equals': 'email',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:lessThan constraint (not directly supported in JSON Schema)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DateRangeShape
            a sh:NodeShape ;
            sh:targetClass ex:DateRange ;
            sh:property [
                sh:path ex:startDate ;
                sh:datatype xsd:date ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:endDate ;
                sh:datatype xsd:date ;
                sh:lessThan ex:startDate ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:lessThan has no direct JSON Schema equivalent
      // Preserved as x-shacl-lessThan extension
      expect(schema).toStrictEqual({
        $defs: {
          DateRange: {
            title: 'DateRange',
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                format: 'date',
              },
              endDate: {
                type: 'string',
                format: 'date',
                'x-shacl-lessThan': 'startDate',
              },
            },
            required: ['startDate', 'endDate'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/DateRangeShape',
        $ref: '#/$defs/DateRange',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Node Kind Constraints', () => {
    it('should handle sh:nodeKind sh:IRI for external references', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DocumentShape
            a sh:NodeShape ;
            sh:targetClass ex:Document ;
            sh:property [
                sh:path ex:externalLink ;
                sh:nodeKind sh:IRI ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Document: {
            title: 'Document',
            type: 'object',
            properties: {
              externalLink: {
                type: 'string',
                format: 'uri',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/DocumentShape',
        $ref: '#/$defs/Document',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:nodeKind sh:Literal for primitive values', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MetadataShape
            a sh:NodeShape ;
            sh:targetClass ex:Metadata ;
            sh:property [
                sh:path ex:description ;
                sh:nodeKind sh:Literal ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Metadata: {
            title: 'Metadata',
            type: 'object',
            properties: {
              description: {
                type: ['string', 'number', 'boolean'],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/MetadataShape',
        $ref: '#/$defs/Metadata',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:nodeKind sh:BlankNode for anonymous nested objects', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ArticleShape
            a sh:NodeShape ;
            sh:targetClass ex:Article ;
            sh:property [
                sh:path ex:author ;
                sh:nodeKind sh:BlankNode ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Article: {
            title: 'Article',
            type: 'object',
            properties: {
              author: {
                type: 'object',
              },
            },
            required: ['author'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ArticleShape',
        $ref: '#/$defs/Article',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:nodeKind sh:BlankNodeOrIRI for flexible object references', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EntityShape
            a sh:NodeShape ;
            sh:targetClass ex:Entity ;
            sh:property [
                sh:path ex:relatedTo ;
                sh:nodeKind sh:BlankNodeOrIRI ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Entity: {
            title: 'Entity',
            type: 'object',
            properties: {
              relatedTo: {
                oneOf: [{ type: 'object' }, { type: 'string', format: 'uri' }],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/EntityShape',
        $ref: '#/$defs/Entity',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:nodeKind sh:BlankNodeOrLiteral for mixed content', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContentShape
            a sh:NodeShape ;
            sh:targetClass ex:Content ;
            sh:property [
                sh:path ex:value ;
                sh:nodeKind sh:BlankNodeOrLiteral ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Content: {
            title: 'Content',
            type: 'object',
            properties: {
              value: {
                oneOf: [{ type: 'object' }, { type: ['string', 'number', 'boolean'] }],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ContentShape',
        $ref: '#/$defs/Content',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:nodeKind sh:IRIOrLiteral for identifiers', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:IdentifierShape
            a sh:NodeShape ;
            sh:targetClass ex:Thing ;
            sh:property [
                sh:path ex:identifier ;
                sh:nodeKind sh:IRIOrLiteral ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Thing: {
            title: 'Thing',
            type: 'object',
            properties: {
              identifier: {
                oneOf: [
                  { type: 'string', format: 'uri' },
                  { type: ['string', 'number', 'boolean'] },
                ],
              },
            },
            required: ['identifier'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/IdentifierShape',
        $ref: '#/$defs/Thing',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Default Values (sh:defaultValue)', () => {
    it('should handle default value with string datatype', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UserShape
            a sh:NodeShape ;
            sh:targetClass ex:User ;
            sh:property [
                sh:path ex:role ;
                sh:datatype xsd:string ;
                sh:defaultValue "user" ;
            ] ;
            sh:property [
                sh:path ex:country ;
                sh:datatype xsd:string ;
                sh:defaultValue "USA" ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          User: {
            title: 'User',
            type: 'object',
            properties: {
              role: {
                type: 'string',
                default: 'user',
              },
              country: {
                type: 'string',
                default: 'USA',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/UserShape',
        $ref: '#/$defs/User',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle default value with numeric datatype', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ConfigShape
            a sh:NodeShape ;
            sh:targetClass ex:Config ;
            sh:property [
                sh:path ex:timeout ;
                sh:datatype xsd:integer ;
                sh:defaultValue 30 ;
                sh:minInclusive 0 ;
                sh:maxInclusive 300 ;
            ] ;
            sh:property [
                sh:path ex:retryCount ;
                sh:datatype xsd:integer ;
                sh:defaultValue 3 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Config: {
            title: 'Config',
            type: 'object',
            properties: {
              timeout: {
                type: 'integer',
                minimum: 0,
                maximum: 300,
                default: 30,
              },
              retryCount: {
                type: 'integer',
                default: 3,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ConfigShape',
        $ref: '#/$defs/Config',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle default value with enumeration', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TaskShape
            a sh:NodeShape ;
            sh:targetClass ex:Task ;
            sh:property [
                sh:path ex:status ;
                sh:datatype xsd:string ;
                sh:in ( "pending" "active" "completed" "cancelled" ) ;
                sh:defaultValue "pending" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:priority ;
                sh:datatype xsd:string ;
                sh:in ( "low" "medium" "high" ) ;
                sh:defaultValue "medium" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Task: {
            title: 'Task',
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'active', 'completed', 'cancelled'],
                default: 'pending',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                default: 'medium',
              },
            },
            required: ['status'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/TaskShape',
        $ref: '#/$defs/Task',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle default value with boolean datatype', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SettingsShape
            a sh:NodeShape ;
            sh:targetClass ex:Settings ;
            sh:property [
                sh:path ex:notificationsEnabled ;
                sh:datatype xsd:boolean ;
                sh:defaultValue true ;
            ] ;
            sh:property [
                sh:path ex:darkMode ;
                sh:datatype xsd:boolean ;
                sh:defaultValue false ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Settings: {
            title: 'Settings',
            type: 'object',
            properties: {
              notificationsEnabled: {
                type: 'boolean',
                default: true,
              },
              darkMode: {
                type: 'boolean',
                default: false,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/SettingsShape',
        $ref: '#/$defs/Settings',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle default value with decimal datatype', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:taxRate ;
                sh:datatype xsd:decimal ;
                sh:defaultValue 0.08 ;
                sh:minInclusive 0.0 ;
                sh:maxInclusive 1.0 ;
            ] ;
            sh:property [
                sh:path ex:discountRate ;
                sh:datatype xsd:decimal ;
                sh:defaultValue 0.0 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Product: {
            title: 'Product',
            type: 'object',
            properties: {
              taxRate: {
                type: 'number',
                minimum: 0.0,
                maximum: 1.0,
                default: 0.08,
              },
              discountRate: {
                type: 'number',
                default: 0.0,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ProductShape',
        $ref: '#/$defs/Product',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Language and Comparison Constraints', () => {
    it('should handle sh:uniqueLang constraint (no direct JSON Schema equivalent)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MultilingualShape
            a sh:NodeShape ;
            sh:targetClass ex:Document ;
            sh:property [
                sh:path ex:title ;
                sh:datatype xsd:string ;
                sh:uniqueLang true ;
                sh:minCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:uniqueLang ensures each language tag appears at most once
      // No direct JSON Schema equivalent, so preserved as extension
      expect(schema).toStrictEqual({
        $defs: {
          Document: {
            title: 'Document',
            type: 'object',
            properties: {
              title: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 1,
                'x-shacl-uniqueLang': true,
              },
            },
            required: ['title'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/MultilingualShape',
        $ref: '#/$defs/Document',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:languageIn constraint (restricts language tags)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:LocalizedContentShape
            a sh:NodeShape ;
            sh:targetClass ex:Content ;
            sh:property [
                sh:path ex:description ;
                sh:datatype xsd:string ;
                sh:languageIn ( "en" "de" "fr" "es" ) ;
                sh:uniqueLang true ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:languageIn restricts language tags to a specific set
      // No direct JSON Schema equivalent, so preserved as extension
      expect(schema).toStrictEqual({
        $defs: {
          Content: {
            title: 'Content',
            type: 'object',
            properties: {
              description: {
                type: 'string',
                'x-shacl-languageIn': ['en', 'de', 'fr', 'es'],
                'x-shacl-uniqueLang': true,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/LocalizedContentShape',
        $ref: '#/$defs/Content',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:lessThanOrEquals constraint', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:VersionRangeShape
            a sh:NodeShape ;
            sh:targetClass ex:Version ;
            sh:property [
                sh:path ex:minVersion ;
                sh:datatype xsd:decimal ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:maxVersion ;
                sh:datatype xsd:decimal ;
                sh:lessThanOrEquals ex:minVersion ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:lessThanOrEquals has no direct JSON Schema equivalent
      // Preserved as x-shacl-lessThanOrEquals extension
      expect(schema).toStrictEqual({
        $defs: {
          Version: {
            title: 'Version',
            type: 'object',
            properties: {
              minVersion: {
                type: 'number',
              },
              maxVersion: {
                type: 'number',
                'x-shacl-lessThanOrEquals': 'minVersion',
              },
            },
            required: ['minVersion', 'maxVersion'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/VersionRangeShape',
        $ref: '#/$defs/Version',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle combination of language constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:languageIn ( "en" "fr" ) ;
                sh:uniqueLang true ;
                sh:minCount 2 ;
                sh:maxCount 2 ;
            ] ;
            sh:property [
                sh:path ex:description ;
                sh:datatype xsd:string ;
                sh:languageIn ( "en" "de" "fr" "es" "it" ) ;
                sh:uniqueLang true ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Product: {
            title: 'Product',
            type: 'object',
            properties: {
              name: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 2,
                maxItems: 2,
                'x-shacl-languageIn': ['en', 'fr'],
                'x-shacl-uniqueLang': true,
              },
              description: {
                type: 'string',
                'x-shacl-languageIn': ['en', 'de', 'fr', 'es', 'it'],
                'x-shacl-uniqueLang': true,
              },
            },
            required: ['name'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ProductShape',
        $ref: '#/$defs/Product',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Property Pair Disjoint Constraints (sh:disjoint)', () => {
    it('should handle sh:disjoint constraint (values must be disjoint)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property [
                sh:path ex:employee ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:manager ;
                sh:datatype xsd:string ;
                sh:disjoint ex:employee ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:disjoint has no direct JSON Schema equivalent
      // Preserved as x-shacl-disjoint extension
      expect(schema).toStrictEqual({
        $defs: {
          Organization: {
            title: 'Organization',
            type: 'object',
            properties: {
              employee: {
                type: 'string',
              },
              manager: {
                type: 'string',
                'x-shacl-disjoint': 'employee',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/OrganizationShape',
        $ref: '#/$defs/Organization',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle multiple sh:disjoint constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TeamShape
            a sh:NodeShape ;
            sh:targetClass ex:Team ;
            sh:property [
                sh:path ex:member ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:lead ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:externalConsultant ;
                sh:datatype xsd:string ;
                sh:disjoint ex:member ;
                sh:disjoint ex:lead ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Team: {
            title: 'Team',
            type: 'object',
            properties: {
              member: {
                type: 'string',
              },
              lead: {
                type: 'string',
              },
              externalConsultant: {
                type: 'string',
                'x-shacl-disjoint': ['member', 'lead'],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/TeamShape',
        $ref: '#/$defs/Team',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:disjoint with cardinality constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RoleShape
            a sh:NodeShape ;
            sh:targetClass ex:Role ;
            sh:property [
                sh:path ex:admin ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] ;
            sh:property [
                sh:path ex:user ;
                sh:datatype xsd:string ;
                sh:disjoint ex:admin ;
                sh:minCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Role: {
            title: 'Role',
            type: 'object',
            properties: {
              admin: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 1,
              },
              user: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 1,
                'x-shacl-disjoint': 'admin',
              },
            },
            required: ['admin', 'user'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/RoleShape',
        $ref: '#/$defs/Role',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Qualified Value Shapes Disjoint (sh:qualifiedValueShapesDisjoint)', () => {
    it('should handle sh:qualifiedValueShapesDisjoint constraint', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContactShape
            a sh:NodeShape ;
            sh:targetClass ex:Contact ;
            sh:property [
                sh:path ex:address ;
                sh:qualifiedValueShape ex:HomeAddressShape ;
                sh:qualifiedMinCount 0 ;
                sh:qualifiedMaxCount 1 ;
                sh:qualifiedValueShapesDisjoint true ;
            ] ;
            sh:property [
                sh:path ex:address ;
                sh:qualifiedValueShape ex:WorkAddressShape ;
                sh:qualifiedMinCount 0 ;
                sh:qualifiedMaxCount 1 ;
            ] .

        ex:HomeAddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:type ;
                sh:hasValue "home" ;
            ] .

        ex:WorkAddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:type ;
                sh:hasValue "work" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:qualifiedValueShapesDisjoint has no direct JSON Schema equivalent
      // Preserved as x-shacl-qualifiedValueShapesDisjoint extension
      expect(schema).toStrictEqual({
        $defs: {
          Contact: {
            title: 'Contact',
            type: 'object',
            properties: {
              address: {
                allOf: [
                  {
                    $ref: '#/$defs/HomeAddress',
                    'x-shacl-qualifiedValueShapesDisjoint': true,
                  },
                  {
                    $ref: '#/$defs/WorkAddress',
                  },
                ],
              },
            },
            additionalProperties: true,
          },
          HomeAddress: {
            type: 'object',
            title: 'HomeAddress',
            additionalProperties: true,
            properties: {
              type: {
                const: 'home',
              },
            },
          },
          WorkAddress: {
            type: 'object',
            title: 'WorkAddress',
            additionalProperties: true,
            properties: {
              type: {
                const: 'work',
              },
            },
          },
        },
        $id: 'http://example.org/ContactShape',
        $ref: '#/$defs/Contact',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Target Constraints (sh:targetNodes, sh:targetObjectsOf, sh:targetSubjectsOf)', () => {
    it('should handle sh:targetNodes constraint', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SpecificNodeShape
            a sh:NodeShape ;
            sh:targetNode ex:Node1, ex:Node2, ex:Node3 ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:targetNode specifies which specific RDF nodes to validate
      // This is RDF-specific and preserved as x-shacl extension
      expect(schema).toStrictEqual({
        $defs: {
          Node1: {
            additionalProperties: true,
            properties: {
              value: {
                type: 'string',
              },
            },
            required: ['value'],
            title: 'Node1',
            type: 'object',
            'x-shacl-targetNodes': [
              'http://example.org/Node1',
              'http://example.org/Node2',
              'http://example.org/Node3',
            ],
          },
          Node2: {
            additionalProperties: true,
            properties: {
              value: {
                type: 'string',
              },
            },
            required: ['value'],
            title: 'Node2',
            type: 'object',
            'x-shacl-targetNodes': [
              'http://example.org/Node1',
              'http://example.org/Node2',
              'http://example.org/Node3',
            ],
          },
          Node3: {
            additionalProperties: true,
            properties: {
              value: {
                type: 'string',
              },
            },
            required: ['value'],
            title: 'Node3',
            type: 'object',
            'x-shacl-targetNodes': [
              'http://example.org/Node1',
              'http://example.org/Node2',
              'http://example.org/Node3',
            ],
          },
        },
        $id: 'http://example.org/SpecificNodeShape',
        $ref: '#/$defs/Node1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:targetObjectsOf constraint', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ObjectTargetShape
            a sh:NodeShape ;
            sh:targetObjectsOf ex:hasMember ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:targetObjectsOf targets nodes that are objects of a predicate
      // This is RDF-specific and preserved as x-shacl extension
      expect(schema).toStrictEqual({
        $defs: {
          ObjectTarget: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            required: ['name'],
            title: 'ObjectTarget',
            additionalProperties: true,
            'x-shacl-targetObjectsOf': 'http://example.org/hasMember',
          },
        },
        $id: 'http://example.org/ObjectTargetShape',
        $ref: '#/$defs/ObjectTarget',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:targetSubjectsOf constraint', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SubjectTargetShape
            a sh:NodeShape ;
            sh:targetSubjectsOf ex:manages ;
            sh:property [
                sh:path ex:title ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Note: sh:targetSubjectsOf targets nodes that are subjects of a predicate
      // This is RDF-specific and preserved as x-shacl extension
      expect(schema).toStrictEqual({
        $defs: {
          SubjectTarget: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
              },
            },
            required: ['title'],
            additionalProperties: true,
            title: 'SubjectTarget',
            'x-shacl-targetSubjectsOf': 'http://example.org/manages',
          },
        },
        $id: 'http://example.org/SubjectTargetShape',
        $ref: '#/$defs/SubjectTarget',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle multiple target constraints together', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MultiTargetShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:targetNode ex:SpecialPerson ;
            sh:targetSubjectsOf ex:knows ;
            sh:property [
                sh:path ex:identifier ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            properties: {
              identifier: {
                type: 'string',
              },
            },
            required: ['identifier'],
            title: 'Person',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/SpecialPerson'],
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
          },
          SpecialPerson: {
            additionalProperties: true,
            properties: {
              identifier: {
                type: 'string',
              },
            },
            required: ['identifier'],
            title: 'SpecialPerson',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/SpecialPerson'],
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
          },
        },
        $id: 'http://example.org/MultiTargetShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('sh:hasValue Constraint', () => {
    it('should handle sh:hasValue with string literal', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ConfigShape
            a sh:NodeShape ;
            sh:targetClass ex:Config ;
            sh:property [
                sh:path ex:version ;
                sh:datatype xsd:string ;
                sh:hasValue "1.0.0" ;
            ] ;
            sh:property [
                sh:path ex:environment ;
                sh:datatype xsd:string ;
                sh:hasValue "production" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Config: {
            title: 'Config',
            type: 'object',
            properties: {
              version: {
                type: 'string',
                const: '1.0.0',
              },
              environment: {
                type: 'string',
                const: 'production',
              },
            },
            required: ['environment'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ConfigShape',
        $ref: '#/$defs/Config',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:hasValue with numeric literal', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ConstantShape
            a sh:NodeShape ;
            sh:targetClass ex:Constant ;
            sh:property [
                sh:path ex:maxRetries ;
                sh:datatype xsd:integer ;
                sh:hasValue 3 ;
            ] ;
            sh:property [
                sh:path ex:timeout ;
                sh:datatype xsd:decimal ;
                sh:hasValue 30.5 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Constant: {
            title: 'Constant',
            type: 'object',
            properties: {
              maxRetries: {
                type: 'integer',
                const: 3,
              },
              timeout: {
                type: 'number',
                const: 30.5,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ConstantShape',
        $ref: '#/$defs/Constant',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:hasValue with boolean literal', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FeatureFlagShape
            a sh:NodeShape ;
            sh:targetClass ex:FeatureFlag ;
            sh:property [
                sh:path ex:enabled ;
                sh:datatype xsd:boolean ;
                sh:hasValue true ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:debugMode ;
                sh:datatype xsd:boolean ;
                sh:hasValue false ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          FeatureFlag: {
            title: 'FeatureFlag',
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                const: true,
              },
              debugMode: {
                type: 'boolean',
                const: false,
              },
            },
            required: ['enabled'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/FeatureFlagShape',
        $ref: '#/$defs/FeatureFlag',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:hasValue with URI', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ResourceShape
            a sh:NodeShape ;
            sh:targetClass ex:Resource ;
            sh:property [
                sh:path ex:type ;
                sh:nodeKind sh:IRI ;
                sh:hasValue ex:StandardType ;
            ] ;
            sh:property [
                sh:path ex:schema ;
                sh:datatype xsd:anyURI ;
                sh:hasValue <https://schema.org/Thing> ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Resource: {
            title: 'Resource',
            type: 'object',
            properties: {
              type: {
                type: 'string',
                format: 'uri',
                const: 'StandardType',
              },
              schema: {
                type: 'string',
                format: 'uri',
                const: 'Thing',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ResourceShape',
        $ref: '#/$defs/Resource',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:hasValue combined with other constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RestrictedShape
            a sh:NodeShape ;
            sh:targetClass ex:Restricted ;
            sh:property [
                sh:path ex:fixedPrefix ;
                sh:datatype xsd:string ;
                sh:hasValue "PREFIX-" ;
                sh:pattern "^PREFIX-.*" ;
                sh:minLength 7 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Restricted: {
            title: 'Restricted',
            type: 'object',
            properties: {
              fixedPrefix: {
                type: 'string',
                const: 'PREFIX-',
                pattern: '^PREFIX-.*',
                minLength: 7,
              },
            },
            required: ['fixedPrefix'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/RestrictedShape',
        $ref: '#/$defs/Restricted',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('sh:class Constraint Edge Cases', () => {
    it('should handle sh:class with single class reference', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:worksFor ;
                sh:class ex:Company ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              worksFor: {
                $ref: '#/$defs/Company',
              },
            },
            required: ['worksFor'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:class with cardinality constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:knows ;
                sh:class ex:Person ;
                sh:minCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              knows: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Person',
                },
                minItems: 1,
              },
            },
            required: ['knows'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:class within logical operators', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DocumentShape
            a sh:NodeShape ;
            sh:targetClass ex:Document ;
            sh:property [
                sh:path ex:creator ;
                sh:or (
                    [ sh:class ex:Person ]
                    [ sh:class ex:Organization ]
                ) ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Document: {
            title: 'Document',
            type: 'object',
            properties: {
              creator: {
                anyOf: [{ $ref: '#/$defs/Person' }, { $ref: '#/$defs/Organization' }],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/DocumentShape',
        $ref: '#/$defs/Document',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('sh:order', () => {
    it('should handle sh:order for property ordering', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FormShape
            a sh:NodeShape ;
            sh:targetClass ex:Form ;
            sh:property [
                sh:path ex:field1 ;
                sh:datatype xsd:string ;
                sh:order 1 ;
            ] ;
            sh:property [
                sh:path ex:field2 ;
                sh:datatype xsd:string ;
                sh:order 2 ;
            ] ;
            sh:property [
                sh:path ex:field3 ;
                sh:datatype xsd:string ;
                sh:order 3 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Form: {
            title: 'Form',
            type: 'object',
            properties: {
              field1: {
                type: 'string',
                'x-shacl-order': 1,
              },
              field2: {
                type: 'string',
                'x-shacl-order': 2,
              },
              field3: {
                type: 'string',
                'x-shacl-order': 3,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/FormShape',
        $ref: '#/$defs/Form',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Qualified Value Shapes', () => {
    it('should handle qualified value shape with qualifiedMinCount', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:address ;
                sh:qualifiedValueShape ex:USAddressShape ;
                sh:qualifiedMinCount 1 ;
            ] .

        ex:USAddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:state ;
                sh:datatype xsd:string ;
                sh:pattern "^[A-Z]{2}$" ;
            ] ;
            sh:property [
                sh:path ex:zipCode ;
                sh:datatype xsd:string ;
                sh:pattern "^[0-9]{5}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            properties: {
              address: {
                items: {
                  $ref: '#/$defs/USAddress',
                },
                minItems: 1,
                type: 'array',
              },
            },
            required: ['address'],
            title: 'Person',
            type: 'object',
          },
          USAddress: {
            additionalProperties: true,
            properties: {
              state: {
                pattern: '^[A-Z]{2}$',
                type: 'string',
              },
              zipCode: {
                pattern: '^[0-9]{5}$',
                type: 'string',
              },
            },
            title: 'USAddress',
            type: 'object',
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle qualified value shape with qualifiedMaxCount', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:CompanyShape
            a sh:NodeShape ;
            sh:targetClass ex:Company ;
            sh:property [
                sh:path ex:office ;
                sh:qualifiedValueShape ex:HeadquartersShape ;
                sh:qualifiedMaxCount 1 ;
            ] .

        ex:HeadquartersShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:isHeadquarters ;
                sh:datatype xsd:boolean ;
                sh:hasValue true ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Company: {
            additionalProperties: true,
            properties: {
              office: {
                items: {
                  $ref: '#/$defs/Headquarters',
                },
                maxItems: 1,
                type: 'array',
              },
            },
            title: 'Company',
            type: 'object',
          },
          Headquarters: {
            additionalProperties: true,
            properties: {
              isHeadquarters: {
                const: true,
                type: 'boolean',
              },
            },
            title: 'Headquarters',
            type: 'object',
          },
        },
        $id: 'http://example.org/CompanyShape',
        $ref: '#/$defs/Company',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle qualified value shape with both min and max', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TeamShape
            a sh:NodeShape ;
            sh:targetClass ex:Team ;
            sh:property [
                sh:path ex:member ;
                sh:qualifiedValueShape ex:LeaderShape ;
                sh:qualifiedMinCount 1 ;
                sh:qualifiedMaxCount 3 ;
            ] .

        ex:LeaderShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:role ;
                sh:datatype xsd:string ;
                sh:in ( "TeamLead" "TechLead" "Manager" ) ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Leader: {
            additionalProperties: true,
            properties: {
              role: {
                enum: ['TeamLead', 'TechLead', 'Manager'],
                type: 'string',
              },
            },
            title: 'Leader',
            type: 'object',
          },
          Team: {
            additionalProperties: true,
            properties: {
              member: {
                items: {
                  $ref: '#/$defs/Leader',
                },
                maxItems: 3,
                minItems: 1,
                type: 'array',
              },
            },
            required: ['member'],
            title: 'Team',
            type: 'object',
          },
        },
        $id: 'http://example.org/TeamShape',
        $ref: '#/$defs/Team',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('SHACL Target Types', () => {
    it('should handle sh:targetObjectsOf and preserve in metadata', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ManagerShape
            a sh:NodeShape ;
            sh:targetObjectsOf ex:hasManager ;
            sh:property [
                sh:path ex:employeeId ;
                sh:datatype xsd:string ;
                sh:pattern "^MGR-[0-9]{4}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Manager: {
            title: 'Manager',
            type: 'object',
            properties: {
              employeeId: {
                type: 'string',
                pattern: '^MGR-[0-9]{4}$',
              },
            },
            'x-shacl-targetObjectsOf': 'http://example.org/hasManager',
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ManagerShape',
        $ref: '#/$defs/Manager',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:targetSubjectsOf and preserve in metadata', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:AuthorShape
            a sh:NodeShape ;
            sh:targetSubjectsOf ex:wrote ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
            ] ;
            sh:property [
                sh:path ex:publications ;
                sh:datatype xsd:integer ;
                sh:minInclusive 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Author: {
            title: 'Author',
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
              },
              publications: {
                type: 'integer',
                minimum: 1,
              },
            },
            required: ['name'],
            'x-shacl-targetSubjectsOf': 'http://example.org/wrote',
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/AuthorShape',
        $ref: '#/$defs/Author',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle shape with multiple target types', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass foaf:Person ;
            sh:targetSubjectsOf ex:knows ;
            sh:targetObjectsOf ex:knows ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              name: {
                items: {
                  type: 'string',
                },
                minItems: 1,
                type: 'array',
              },
            },
            required: ['name'],
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
            'x-shacl-targetObjectsOf': 'http://example.org/knows',
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
          foaf: 'http://xmlns.com/foaf/0.1/',
        },
      });
    });

    it('should handle multiple sh:targetObjectsOf values', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetObjectsOf ex:worksFor ;
            sh:targetObjectsOf ex:memberOf ;
            sh:targetObjectsOf ex:affiliatedWith ;
            sh:property [
                sh:path ex:orgName ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Organization: {
            title: 'Organization',
            type: 'object',
            properties: {
              orgName: {
                type: 'string',
              },
            },
            'x-shacl-targetObjectsOf': [
              'http://example.org/worksFor',
              'http://example.org/memberOf',
              'http://example.org/affiliatedWith',
            ],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/OrganizationShape',
        $ref: '#/$defs/Organization',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle FOAF-style relationship validation with targetObjectsOf', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        # Validates all nodes that are friends of someone
        ex:FriendShape
            a sh:NodeShape ;
            sh:targetObjectsOf foaf:knows ;
            sh:property [
                sh:path foaf:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] ;
            sh:property [
                sh:path foaf:mbox ;
                sh:datatype xsd:string ;
                sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Friend: {
            title: 'Friend',
            type: 'object',
            properties: {
              name: {
                items: {
                  type: 'string',
                },
                minItems: 1,
                type: 'array',
              },
              mbox: {
                type: 'string',
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
              },
            },
            required: ['name'],
            'x-shacl-targetObjectsOf': 'http://xmlns.com/foaf/0.1/knows',
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/FriendShape',
        $ref: '#/$defs/Friend',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          foaf: 'http://xmlns.com/foaf/0.1/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle targetSubjectsOf for validating all creators', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        # All nodes that have created something must have these properties
        ex:CreatorShape
            a sh:NodeShape ;
            sh:targetSubjectsOf dcterms:creator ;
            sh:property [
                sh:path ex:creatorId ;
                sh:datatype xsd:string ;
                sh:pattern "^CREATOR-[0-9]{6}$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:verified ;
                sh:datatype xsd:boolean ;
                sh:hasValue true ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Creator: {
            title: 'Creator',
            type: 'object',
            properties: {
              creatorId: {
                type: 'string',
                pattern: '^CREATOR-[0-9]{6}$',
              },
              verified: {
                type: 'boolean',
                const: true,
              },
            },
            required: ['creatorId'],
            'x-shacl-targetSubjectsOf': 'http://purl.org/dc/terms/creator',
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/CreatorShape',
        $ref: '#/$defs/Creator',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          dcterms: 'http://purl.org/dc/terms/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('sh:pattern with Flags', () => {
    it('should handle pattern with case-insensitive flag', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:CaseInsensitiveShape
            a sh:NodeShape ;
            sh:targetClass ex:CaseInsensitive ;
            sh:property [
                sh:path ex:code ;
                sh:datatype xsd:string ;
                sh:pattern "^[a-z]+$" ;
                sh:flags "i" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          CaseInsensitive: {
            title: 'CaseInsensitive',
            type: 'object',
            properties: {
              code: {
                pattern: '^[a-z]+$',
                type: 'string',
                'x-shacl-flags': 'i',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/CaseInsensitiveShape',
        $ref: '#/$defs/CaseInsensitive',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle pattern with multiline flag', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MultilineShape
            a sh:NodeShape ;
            sh:targetClass ex:Multiline ;
            sh:property [
                sh:path ex:text ;
                sh:datatype xsd:string ;
                sh:pattern "^Line 1.*Line 2$" ;
                sh:flags "s" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Multiline: {
            title: 'Multiline',
            type: 'object',
            properties: {
              text: {
                pattern: '^Line 1.*Line 2$',
                type: 'string',
                'x-shacl-flags': 's',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/MultilineShape',
        $ref: '#/$defs/Multiline',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle pattern with multiple flags', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MultiFlagShape
            a sh:NodeShape ;
            sh:targetClass ex:MultiFlag ;
            sh:property [
                sh:path ex:content ;
                sh:datatype xsd:string ;
                sh:pattern "pattern" ;
                sh:flags "im" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          MultiFlag: {
            title: 'MultiFlag',
            type: 'object',
            properties: {
              content: {
                pattern: 'pattern',
                type: 'string',
                'x-shacl-flags': 'im',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/MultiFlagShape',
        $ref: '#/$defs/MultiFlag',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Shape Metadata (sh:message, sh:severity)', () => {
    it('should handle sh:message constraint (custom validation message)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:message "Person validation failed" ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$" ;
                sh:message "Email must be a valid email address" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            'x-shacl-message': {
              datatype: 'http://www.w3.org/2001/XMLSchema#string',
              type: 'literal',
              value: 'Person validation failed',
            },
            properties: {
              email: {
                type: 'string',
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                'x-shacl-message': {
                  datatype: 'http://www.w3.org/2001/XMLSchema#string',
                  type: 'literal',
                  value: 'Email must be a valid email address',
                },
              },
            },
            required: ['email'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:severity constraint (validation severity level)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DataQualityShape
            a sh:NodeShape ;
            sh:targetClass ex:DataRecord ;
            sh:severity sh:Warning ;
            sh:property [
                sh:path ex:optionalField ;
                sh:datatype xsd:string ;
                sh:severity sh:Info ;
                sh:maxLength 100 ;
            ] ;
            sh:property [
                sh:path ex:criticalField ;
                sh:datatype xsd:string ;
                sh:severity sh:Violation ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          DataRecord: {
            title: 'DataRecord',
            type: 'object',
            'x-shacl-severity': 'sh:Warning',
            properties: {
              optionalField: {
                type: 'string',
                maxLength: 100,
                'x-shacl-severity': 'sh:Info',
              },
              criticalField: {
                type: 'string',
                'x-shacl-severity': 'sh:Violation',
              },
            },
            required: ['criticalField'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/DataQualityShape',
        $ref: '#/$defs/DataRecord',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle both sh:message and sh:severity together', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ValidationShape
            a sh:NodeShape ;
            sh:targetClass ex:ValidationTest ;
            sh:message "Shape validation constraints not met" ;
            sh:severity sh:Violation ;
            sh:property [
                sh:path ex:username ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
                sh:maxLength 20 ;
                sh:message "Username must be between 3 and 20 characters" ;
                sh:severity sh:Warning ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ValidationTest: {
            additionalProperties: true,
            properties: {
              username: {
                maxLength: 20,
                minLength: 3,
                type: 'string',
                'x-shacl-message': {
                  datatype: 'http://www.w3.org/2001/XMLSchema#string',
                  type: 'literal',
                  value: 'Username must be between 3 and 20 characters',
                },
                'x-shacl-severity': 'sh:Warning',
              },
            },
            required: ['username'],
            title: 'ValidationTest',
            type: 'object',
            'x-shacl-message': {
              datatype: 'http://www.w3.org/2001/XMLSchema#string',
              type: 'literal',
              value: 'Shape validation constraints not met',
            },
            'x-shacl-severity': 'sh:Violation',
          },
        },
        $id: 'http://example.org/ValidationShape',
        $ref: '#/$defs/ValidationTest',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Shape Deactivation (sh:deactivated)', () => {
    it('should handle sh:deactivated true on node shape', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DeprecatedShape
            a sh:NodeShape ;
            sh:targetClass ex:LegacyUser ;
            sh:deactivated true ;
            sh:property [
                sh:path ex:username ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          LegacyUser: {
            title: 'LegacyUser',
            type: 'object',
            'x-shacl-deactivated': true,
            properties: {
              username: {
                type: 'string',
              },
            },
            required: ['username'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/DeprecatedShape',
        $ref: '#/$defs/LegacyUser',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:deactivated on property shape', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UserShape
            a sh:NodeShape ;
            sh:targetClass ex:User ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:legacyField ;
                sh:datatype xsd:string ;
                sh:deactivated true ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          User: {
            title: 'User',
            type: 'object',
            properties: {
              email: {
                type: 'string',
              },
              legacyField: {
                type: 'string',
                'x-shacl-deactivated': true,
              },
            },
            required: ['email'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/UserShape',
        $ref: '#/$defs/User',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:deactivated false (explicitly activated)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ActiveShape
            a sh:NodeShape ;
            sh:targetClass ex:ActiveUser ;
            sh:deactivated false ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:deactivated false ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // sh:deactivated false should not add any extension (default state)
      expect(schema).toStrictEqual({
        $defs: {
          ActiveUser: {
            title: 'ActiveUser',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ActiveShape',
        $ref: '#/$defs/ActiveUser',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Closed Shapes and additionalProperties', () => {
    it('should handle sh:closed true to disallow additional properties', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:StrictPersonShape
            a sh:NodeShape ;
            sh:targetClass ex:StrictPerson ;
            sh:closed true ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          StrictPerson: {
            title: 'StrictPerson',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              age: {
                type: 'integer',
              },
            },
            additionalProperties: false,
          },
        },
        $id: 'http://example.org/StrictPersonShape',
        $ref: '#/$defs/StrictPerson',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle sh:closed with sh:ignoredProperties', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        ex:TypedPersonShape
            a sh:NodeShape ;
            sh:targetClass ex:TypedPerson ;
            sh:closed true ;
            sh:ignoredProperties ( rdf:type ) ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // sh:ignoredProperties doesn't have a direct JSON Schema equivalent
      // The shape is still closed, but RDF validators would allow rdf:type
      expect(schema).toStrictEqual({
        $defs: {
          TypedPerson: {
            title: 'TypedPerson',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: false,
            'x-shacl-ignoredProperties': ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
          },
        },
        $id: 'http://example.org/TypedPersonShape',
        $ref: '#/$defs/TypedPerson',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
      });
    });

    it('should default to additionalProperties true when sh:closed is false or absent', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FlexiblePersonShape
            a sh:NodeShape ;
            sh:targetClass ex:FlexiblePerson ;
            sh:closed false ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          FlexiblePerson: {
            title: 'FlexiblePerson',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/FlexiblePersonShape',
        $ref: '#/$defs/FlexiblePerson',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('sh:in (Enumeration) Edge Cases', () => {
    it('should handle single value enumeration', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SingletonShape
            a sh:NodeShape ;
            sh:targetClass ex:Singleton ;
            sh:property [
                sh:path ex:status ;
                sh:datatype xsd:string ;
                sh:in ( "active" ) ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Singleton: {
            title: 'Singleton',
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['active'],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/SingletonShape',
        $ref: '#/$defs/Singleton',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle mixed type enumeration (strings and numbers)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MixedEnumShape
            a sh:NodeShape ;
            sh:targetClass ex:MixedEnum ;
            sh:property [
                sh:path ex:value ;
                sh:in ( "low" "medium" "high" 1 2 3 ) ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          MixedEnum: {
            title: 'MixedEnum',
            type: 'object',
            properties: {
              value: {
                enum: ['low', 'medium', 'high', '1', '2', '3'],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/MixedEnumShape',
        $ref: '#/$defs/MixedEnum',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle enumeration with URIs', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:CategoryShape
            a sh:NodeShape ;
            sh:targetClass ex:Document ;
            sh:property [
                sh:path ex:category ;
                sh:in ( ex:Science ex:Technology ex:Engineering ex:Mathematics ) ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Document: {
            title: 'Document',
            type: 'object',
            properties: {
              category: {
                enum: ['Science', 'Technology', 'Engineering', 'Mathematics'],
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/CategoryShape',
        $ref: '#/$defs/Document',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle enumeration combined with other constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PriorityShape
            a sh:NodeShape ;
            sh:targetClass ex:Task ;
            sh:property [
                sh:path ex:priority ;
                sh:datatype xsd:string ;
                sh:in ( "low" "medium" "high" "critical" ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Task: {
            title: 'Task',
            type: 'object',
            properties: {
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
              },
            },
            required: ['priority'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PriorityShape',
        $ref: '#/$defs/Task',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('sh:ignored', () => {
    it('should handle sh:ignoredProperties with multiple properties', async () => {
      const content = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix ex: <http://example.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

    ex:DocumentShape
        a sh:NodeShape ;
        sh:targetClass ex:Document ;
        sh:closed true ;
        sh:ignoredProperties ( rdf:type rdfs:label rdfs:comment ) ;
        sh:property [
            sh:path ex:title ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
            sh:maxCount 1 ;
        ] ;
        sh:property [
            sh:path ex:content ;
            sh:datatype xsd:string ;
        ] .
  `;

      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Document: {
            title: 'Document',
            type: 'object',
            properties: {
              title: {
                type: 'string',
              },
              content: {
                type: 'string',
              },
            },
            required: ['title'],
            additionalProperties: false,
            'x-shacl-ignoredProperties': [
              'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              'http://www.w3.org/2000/01/rdf-schema#label',
              'http://www.w3.org/2000/01/rdf-schema#comment',
            ],
          },
        },
        $id: 'http://example.org/DocumentShape',
        $ref: '#/$defs/Document',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        },
      });
    });

    it('should handle sh:ignoredProperties without sh:closed (preserved as metadata)', async () => {
      const content = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix ex: <http://example.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:OpenShape
        a sh:NodeShape ;
        sh:targetClass ex:OpenEntity ;
        sh:ignoredProperties ( rdf:type ) ;
        sh:property [
            sh:path ex:name ;
            sh:datatype xsd:string ;
        ] .
  `;

      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: sh:ignoredProperties without sh:closed has no validation effect
      // but is preserved for documentation purposes
      expect(schema).toStrictEqual({
        $defs: {
          OpenEntity: {
            title: 'OpenEntity',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
            'x-shacl-ignoredProperties': ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
          },
        },
        $id: 'http://example.org/OpenShape',
        $ref: '#/$defs/OpenEntity',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
      });
    });
  });
});
