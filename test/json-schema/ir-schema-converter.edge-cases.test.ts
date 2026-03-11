import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../../src/ir/intermediate-representation-builder';
import { ShaclParser } from '../../src/shacl/parser/shacl-parser';
import { IrSchemaConverter } from '../../src/json-schema/ir-schema-converter';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('IR Schema Converter - Edge Cases', () => {
  describe('Cardinality Edge Cases', () => {
    it('should handle unbounded array with no constraints (primitives default to single)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TagShape
            a sh:NodeShape ;
            sh:targetClass ex:Item ;
            sh:property [
                sh:path ex:tags ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Item: {
            additionalProperties: true,
            properties: {
              tags: {
                type: 'string',
              },
            },
            title: 'Item',
            type: 'object',
          },
        },
        $id: 'http://example.org/TagShape',
        $ref: '#/$defs/Item',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle optional unbounded array (minCount 0, no maxCount)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:NoteShape
            a sh:NodeShape ;
            sh:targetClass ex:Document ;
            sh:property [
                sh:path ex:notes ;
                sh:datatype xsd:string ;
                sh:minCount 0 ;
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
              notes: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/NoteShape',
        $ref: '#/$defs/Document',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle required unbounded array (minCount 1, no maxCount)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:AuthorShape
            a sh:NodeShape ;
            sh:targetClass ex:Article ;
            sh:property [
                sh:path ex:authors ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
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
              authors: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 1,
              },
            },
            required: ['authors'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/AuthorShape',
        $ref: '#/$defs/Article',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle bounded array (minCount 2, maxCount 5)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:CategoryShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:categories ;
                sh:datatype xsd:string ;
                sh:minCount 2 ;
                sh:maxCount 5 ;
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
              categories: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 2,
                maxItems: 5,
              },
            },
            required: ['categories'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/CategoryShape',
        $ref: '#/$defs/Product',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle optional single value (minCount 0, maxCount 1)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DescriptionShape
            a sh:NodeShape ;
            sh:targetClass ex:Item ;
            sh:property [
                sh:path ex:description ;
                sh:datatype xsd:string ;
                sh:minCount 0 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Item: {
            title: 'Item',
            type: 'object',
            properties: {
              description: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/DescriptionShape',
        $ref: '#/$defs/Item',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle object references without constraints as arrays', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProjectShape
            a sh:NodeShape ;
            sh:targetClass ex:Project ;
            sh:property [
                sh:path ex:members ;
                sh:node ex:PersonShape ;
            ] .

        ex:PersonShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'Person',
            type: 'object',
          },
          Project: {
            additionalProperties: true,
            properties: {
              members: {
                items: {
                  $ref: '#/$defs/Person',
                },
                type: 'array',
              },
            },
            title: 'Project',
            type: 'object',
          },
        },
        $id: 'http://example.org/ProjectShape',
        $ref: '#/$defs/Project',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle large minCount values', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:BatchShape
            a sh:NodeShape ;
            sh:targetClass ex:Batch ;
            sh:property [
                sh:path ex:items ;
                sh:datatype xsd:string ;
                sh:minCount 100 ;
                sh:maxCount 1000 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Batch: {
            title: 'Batch',
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 100,
                maxItems: 1000,
              },
            },
            required: ['items'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/BatchShape',
        $ref: '#/$defs/Batch',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle exact count (minCount = maxCount)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TeamShape
            a sh:NodeShape ;
            sh:targetClass ex:Team ;
            sh:property [
                sh:path ex:members ;
                sh:datatype xsd:string ;
                sh:minCount 5 ;
                sh:maxCount 5 ;
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
              members: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 5,
                maxItems: 5,
              },
            },
            required: ['members'],
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
  });

  describe('Multiple Datatypes in Union', () => {
    it('should handle product ID as string or number', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:productId ;
                sh:or (
                    [ sh:datatype xsd:string ; sh:pattern "^[A-Z]{3}-[0-9]{4}$" ]
                    [ sh:datatype xsd:integer ; sh:minInclusive 1000 ]
                ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Product: {
            additionalProperties: true,
            properties: {
              productId: {
                anyOf: [
                  {
                    pattern: '^[A-Z]{3}-[0-9]{4}$',
                    type: 'string',
                  },
                  {
                    minimum: 1000,
                    type: 'integer',
                  },
                ],
              },
            },
            required: ['productId'],
            title: 'Product',
            type: 'object',
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

    it('should handle tax identifier as national ID or international format', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TaxPayerShape
            a sh:NodeShape ;
            sh:targetClass ex:TaxPayer ;
            sh:property [
                sh:path ex:taxId ;
                sh:or (
                    [ sh:datatype xsd:integer ]
                    [ sh:datatype xsd:anyURI ]
                ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          TaxPayer: {
            additionalProperties: true,
            properties: {
              taxId: {
                anyOf: [
                  {
                    type: 'integer',
                  },
                  {
                    format: 'uri',
                    type: 'string',
                  },
                ],
              },
            },
            required: ['taxId'],
            title: 'TaxPayer',
            type: 'object',
          },
        },
        $id: 'http://example.org/TaxPayerShape',
        $ref: '#/$defs/TaxPayer',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle publication date with flexible precision', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PublicationShape
            a sh:NodeShape ;
            sh:targetClass ex:Publication ;
            sh:property [
                sh:path ex:publishedDate ;
                sh:or (
                    [ sh:datatype xsd:date ]
                    [ sh:datatype xsd:dateTime ]
                    [ sh:datatype xsd:gYear ]
                ) ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Publication: {
            additionalProperties: true,
            properties: {
              publishedDate: {
                anyOf: [
                  {
                    format: 'date',
                    type: 'string',
                  },
                  {
                    format: 'date-time',
                    type: 'string',
                  },
                  {
                    type: 'string',
                  },
                ],
              },
            },
            title: 'Publication',
            type: 'object',
          },
        },
        $id: 'http://example.org/PublicationShape',
        $ref: '#/$defs/Publication',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle API response with multiple value types', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ApiResponseShape
            a sh:NodeShape ;
            sh:targetClass ex:ApiResponse ;
            sh:property [
                sh:path ex:result ;
                sh:or (
                    [ sh:datatype xsd:string ]
                    [ sh:datatype xsd:integer ]
                    [ sh:datatype xsd:boolean ]
                    [ sh:class ex:ErrorObject ]
                ) ;
            ] .

        ex:ErrorObject
            a sh:NodeShape ;
            sh:property [
                sh:path ex:code ;
                sh:datatype xsd:integer ;
            ] ;
            sh:property [
                sh:path ex:message ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ApiResponse: {
            additionalProperties: true,
            properties: {
              result: {
                anyOf: [
                  {
                    type: 'string',
                  },
                  {
                    type: 'integer',
                  },
                  {
                    type: 'boolean',
                  },
                  {
                    $ref: '#/$defs/ErrorObject',
                  },
                ],
              },
            },
            title: 'ApiResponse',
            type: 'object',
          },
          ErrorObject: {
            additionalProperties: true,
            properties: {
              code: {
                type: 'integer',
              },
              message: {
                type: 'string',
              },
            },
            title: 'ErrorObject',
            type: 'object',
          },
        },
        $id: 'http://example.org/ApiResponseShape',
        $ref: '#/$defs/ApiResponse',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Complex Nested Logical Operators', () => {
    it('should handle email validation with domain restrictions', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UserShape
            a sh:NodeShape ;
            sh:targetClass ex:User ;
            sh:property [
                sh:path ex:email ;
                sh:and (
                    [ sh:datatype xsd:string ]
                    [
                        sh:or (
                            [ sh:pattern ".*@company\\.com$" ]
                            [ sh:pattern ".*@partner\\.org$" ]
                        )
                    ]
                ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          User: {
            additionalProperties: true,
            properties: {
              email: {
                allOf: [
                  {
                    type: 'string',
                  },
                  {
                    anyOf: [
                      {
                        pattern: '.*@company.com$',
                      },
                      {
                        pattern: '.*@partner.org$',
                      },
                    ],
                  },
                ],
              },
            },
            required: ['email'],
            title: 'User',
            type: 'object',
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

    it('should handle age validation with special cases', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ParticipantShape
            a sh:NodeShape ;
            sh:targetClass ex:Participant ;
            sh:property [
                sh:path ex:age ;
                sh:or (
                    [
                        sh:and (
                            [ sh:datatype xsd:integer ]
                            [ sh:minInclusive 18 ]
                            [ sh:maxInclusive 65 ]
                        )
                    ]
                    [
                        sh:and (
                            [ sh:datatype xsd:string ]
                            [ sh:in ( "minor-with-guardian" "senior-exempt" ) ]
                        )
                    ]
                ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Participant: {
            additionalProperties: true,
            properties: {
              age: {
                anyOf: [
                  {
                    allOf: [
                      {
                        type: 'integer',
                      },
                      {
                        minimum: 18,
                      },
                      {
                        maximum: 65,
                      },
                    ],
                  },
                  {
                    allOf: [
                      {
                        type: 'string',
                      },
                      {
                        enum: ['minor-with-guardian', 'senior-exempt'],
                      },
                    ],
                  },
                ],
              },
            },
            required: ['age'],
            title: 'Participant',
            type: 'object',
          },
        },
        $id: 'http://example.org/ParticipantShape',
        $ref: '#/$defs/Participant',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle address with multiple format options', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:LocationShape
            a sh:NodeShape ;
            sh:targetClass ex:Location ;
            sh:property [
                sh:path ex:address ;
                sh:xone (
                    [
                        sh:and (
                            [ sh:class ex:StructuredAddress ]
                            [
                                sh:or (
                                    [ sh:node ex:USAddress ]
                                    [ sh:node ex:EUAddress ]
                                )
                            ]
                        )
                    ]
                    [
                        sh:and (
                            [ sh:datatype xsd:string ]
                            [ sh:minLength 10 ]
                            [ sh:maxLength 200 ]
                        )
                    ]
                ) ;
            ] .

        ex:StructuredAddress
            a sh:NodeShape ;
            sh:property [
                sh:path ex:street ;
                sh:datatype xsd:string ;
            ] .

        ex:USAddress
            a sh:NodeShape ;
            sh:property [
                sh:path ex:zipCode ;
                sh:datatype xsd:string ;
                sh:pattern "^[0-9]{5}$" ;
            ] .

        ex:EUAddress
            a sh:NodeShape ;
            sh:property [
                sh:path ex:postalCode ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          EUAddress: {
            additionalProperties: true,
            properties: {
              postalCode: {
                type: 'string',
              },
            },
            title: 'EUAddress',
            type: 'object',
          },
          Location: {
            additionalProperties: true,
            properties: {
              address: {
                oneOf: [
                  {
                    allOf: [
                      {
                        $ref: '#/$defs/StructuredAddress',
                      },
                      {
                        anyOf: [
                          {
                            $ref: '#/$defs/USAddress',
                          },
                          {
                            $ref: '#/$defs/EUAddress',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    allOf: [
                      {
                        type: 'string',
                      },
                      {
                        minLength: 10,
                      },
                      {
                        maxLength: 200,
                      },
                    ],
                  },
                ],
              },
            },
            title: 'Location',
            type: 'object',
          },
          StructuredAddress: {
            additionalProperties: true,
            properties: {
              street: {
                type: 'string',
              },
            },
            title: 'StructuredAddress',
            type: 'object',
          },
          USAddress: {
            additionalProperties: true,
            properties: {
              zipCode: {
                pattern: '^[0-9]{5}$',
                type: 'string',
              },
            },
            title: 'USAddress',
            type: 'object',
          },
        },
        $id: 'http://example.org/LocationShape',
        $ref: '#/$defs/Location',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Additional XSD Datatypes', () => {
    it('should handle xsd:time datatype', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ScheduleShape
            a sh:NodeShape ;
            sh:targetClass ex:Schedule ;
            sh:property [
                sh:path ex:startTime ;
                sh:datatype xsd:time ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Schedule: {
            title: 'Schedule',
            type: 'object',
            properties: {
              startTime: {
                type: 'string',
                format: 'time',
              },
            },
            required: ['startTime'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ScheduleShape',
        $ref: '#/$defs/Schedule',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle xsd:duration datatype', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EventShape
            a sh:NodeShape ;
            sh:targetClass ex:Event ;
            sh:property [
                sh:path ex:duration ;
                sh:datatype xsd:duration ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Event: {
            title: 'Event',
            type: 'object',
            properties: {
              duration: {
                type: 'string',
                format: 'duration',
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

    it('should handle xsd:gYearMonth and xsd:gMonthDay datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PartialDateShape
            a sh:NodeShape ;
            sh:targetClass ex:PartialDate ;
            sh:property [
                sh:path ex:yearMonth ;
                sh:datatype xsd:gYearMonth ;
            ] ;
            sh:property [
                sh:path ex:monthDay ;
                sh:datatype xsd:gMonthDay ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          PartialDate: {
            title: 'PartialDate',
            type: 'object',
            properties: {
              yearMonth: {
                type: 'string',
              },
              monthDay: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PartialDateShape',
        $ref: '#/$defs/PartialDate',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle xsd:byte, xsd:short, xsd:long datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:IntegerVariantsShape
            a sh:NodeShape ;
            sh:targetClass ex:IntegerVariants ;
            sh:property [
                sh:path ex:byteValue ;
                sh:datatype xsd:byte ;
            ] ;
            sh:property [
                sh:path ex:shortValue ;
                sh:datatype xsd:short ;
            ] ;
            sh:property [
                sh:path ex:longValue ;
                sh:datatype xsd:long ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          IntegerVariants: {
            title: 'IntegerVariants',
            type: 'object',
            properties: {
              byteValue: {
                type: 'integer',
              },
              shortValue: {
                type: 'integer',
              },
              longValue: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/IntegerVariantsShape',
        $ref: '#/$defs/IntegerVariants',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle xsd:float and xsd:double datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FloatingPointShape
            a sh:NodeShape ;
            sh:targetClass ex:FloatingPoint ;
            sh:property [
                sh:path ex:floatValue ;
                sh:datatype xsd:float ;
            ] ;
            sh:property [
                sh:path ex:doubleValue ;
                sh:datatype xsd:double ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          FloatingPoint: {
            title: 'FloatingPoint',
            type: 'object',
            properties: {
              floatValue: {
                type: 'number',
              },
              doubleValue: {
                type: 'number',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/FloatingPointShape',
        $ref: '#/$defs/FloatingPoint',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle xsd:base64Binary and xsd:hexBinary datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:BinaryDataShape
            a sh:NodeShape ;
            sh:targetClass ex:BinaryData ;
            sh:property [
                sh:path ex:base64Data ;
                sh:datatype xsd:base64Binary ;
            ] ;
            sh:property [
                sh:path ex:hexData ;
                sh:datatype xsd:hexBinary ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          BinaryData: {
            title: 'BinaryData',
            type: 'object',
            properties: {
              base64Data: {
                type: 'string',
                contentEncoding: 'base64',
              },
              hexData: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/BinaryDataShape',
        $ref: '#/$defs/BinaryData',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle unsigned integer datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UnsignedShape
            a sh:NodeShape ;
            sh:targetClass ex:Unsigned ;
            sh:property [
                sh:path ex:unsignedInt ;
                sh:datatype xsd:unsignedInt ;
            ] ;
            sh:property [
                sh:path ex:unsignedLong ;
                sh:datatype xsd:unsignedLong ;
            ] ;
            sh:property [
                sh:path ex:unsignedShort ;
                sh:datatype xsd:unsignedShort ;
            ] ;
            sh:property [
                sh:path ex:unsignedByte ;
                sh:datatype xsd:unsignedByte ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Unsigned: {
            title: 'Unsigned',
            type: 'object',
            properties: {
              unsignedInt: {
                type: 'integer',
                minimum: 0,
              },
              unsignedLong: {
                type: 'integer',
                minimum: 0,
              },
              unsignedShort: {
                type: 'integer',
                minimum: 0,
              },
              unsignedByte: {
                type: 'integer',
                minimum: 0,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/UnsignedShape',
        $ref: '#/$defs/Unsigned',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle signed integer constraint datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SignedShape
            a sh:NodeShape ;
            sh:targetClass ex:Signed ;
            sh:property [
                sh:path ex:positiveInt ;
                sh:datatype xsd:positiveInteger ;
            ] ;
            sh:property [
                sh:path ex:nonNegativeInt ;
                sh:datatype xsd:nonNegativeInteger ;
            ] ;
            sh:property [
                sh:path ex:negativeInt ;
                sh:datatype xsd:negativeInteger ;
            ] ;
            sh:property [
                sh:path ex:nonPositiveInt ;
                sh:datatype xsd:nonPositiveInteger ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Signed: {
            title: 'Signed',
            type: 'object',
            properties: {
              positiveInt: {
                type: 'integer',
                minimum: 1,
              },
              nonNegativeInt: {
                type: 'integer',
                minimum: 0,
              },
              negativeInt: {
                type: 'integer',
                maximum: -1,
              },
              nonPositiveInt: {
                type: 'integer',
                maximum: 0,
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/SignedShape',
        $ref: '#/$defs/Signed',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle string-derived datatypes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:StringVariantsShape
            a sh:NodeShape ;
            sh:targetClass ex:StringVariants ;
            sh:property [
                sh:path ex:normalized ;
                sh:datatype xsd:normalizedString ;
            ] ;
            sh:property [
                sh:path ex:token ;
                sh:datatype xsd:token ;
            ] ;
            sh:property [
                sh:path ex:language ;
                sh:datatype xsd:language ;
            ] ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:Name ;
            ] ;
            sh:property [
                sh:path ex:ncName ;
                sh:datatype xsd:NCName ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          StringVariants: {
            title: 'StringVariants',
            type: 'object',
            properties: {
              normalized: {
                type: 'string',
              },
              token: {
                type: 'string',
              },
              language: {
                type: 'string',
              },
              name: {
                type: 'string',
              },
              ncName: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/StringVariantsShape',
        $ref: '#/$defs/StringVariants',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Empty and Null Value Edge Cases', () => {
    it('should handle property with no constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UnconstrainedShape
            a sh:NodeShape ;
            sh:targetClass ex:Unconstrained ;
            sh:property [
                sh:path ex:anything ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Unconstrained: {
            title: 'Unconstrained',
            type: 'object',
            properties: {
              anything: {
                type: 'array',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/UnconstrainedShape',
        $ref: '#/$defs/Unconstrained',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle shape with no properties', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .

        ex:EmptyShape
            a sh:NodeShape ;
            sh:targetClass ex:Empty .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Empty: {
            title: 'Empty',
            type: 'object',
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/EmptyShape',
        $ref: '#/$defs/Empty',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
        },
      });
    });

    it('should handle shape with only metadata (no constraints)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MetadataOnlyShape
            a sh:NodeShape ;
            sh:targetClass ex:MetadataOnly ;
            sh:name "Metadata Only Shape" ;
            sh:description "A shape with only metadata" ;
            sh:message "Validation failed" ;
            sh:severity sh:Info .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          MetadataOnly: {
            additionalProperties: true,
            title: 'MetadataOnly',
            type: 'object',
            'x-shacl-description': {
              datatype: 'string',
              type: 'literal',
              value: 'A shape with only metadata',
            },
            'x-shacl-message': {
              datatype: 'http://www.w3.org/2001/XMLSchema#string',
              type: 'literal',
              value: 'Validation failed',
            },
            'x-shacl-name': {
              datatype: 'string',
              type: 'literal',
              value: 'Metadata Only ',
            },
            'x-shacl-severity': 'sh:Info',
          },
        },
        $id: 'http://example.org/MetadataOnlyShape',
        $ref: '#/$defs/MetadataOnly',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Advanced sh:node Patterns', () => {
    it('should handle sh:node within logical operators', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FlexibleContactShape
            a sh:NodeShape ;
            sh:targetClass ex:Contact ;
            sh:property [
                sh:path ex:address ;
                sh:or (
                    [ sh:node ex:PhysicalAddressShape ]
                    [ sh:node ex:EmailAddressShape ]
                ) ;
            ] .

        ex:PhysicalAddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:street ;
                sh:datatype xsd:string ;
            ] .

        ex:EmailAddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Contact: {
            additionalProperties: true,
            properties: {
              address: {
                anyOf: [
                  {
                    $ref: '#/$defs/PhysicalAddress',
                  },
                  {
                    $ref: '#/$defs/EmailAddress',
                  },
                ],
              },
            },
            title: 'Contact',
            type: 'object',
          },
          EmailAddress: {
            additionalProperties: true,
            properties: {
              email: {
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                type: 'string',
              },
            },
            title: 'EmailAddress',
            type: 'object',
          },
          PhysicalAddress: {
            additionalProperties: true,
            properties: {
              street: {
                type: 'string',
              },
            },
            title: 'PhysicalAddress',
            type: 'object',
          },
        },
        $id: 'http://example.org/FlexibleContactShape',
        $ref: '#/$defs/Contact',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle multiple sh:node references in same property', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MultiNodeShape
            a sh:NodeShape ;
            sh:targetClass ex:MultiNode ;
            sh:property [
                sh:path ex:combined ;
                sh:and (
                    [ sh:node ex:RequiredFieldsShape ]
                    [ sh:node ex:ValidationRulesShape ]
                ) ;
            ] .

        ex:RequiredFieldsShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:id ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] .

        ex:ValidationRulesShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:id ;
                sh:datatype xsd:string ;
                sh:pattern "^[A-Z]{3}-[0-9]{4}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          MultiNode: {
            additionalProperties: true,
            properties: {
              combined: {
                allOf: [
                  {
                    $ref: '#/$defs/RequiredFields',
                  },
                  {
                    $ref: '#/$defs/ValidationRules',
                  },
                ],
              },
            },
            title: 'MultiNode',
            type: 'object',
          },
          RequiredFields: {
            additionalProperties: true,
            properties: {
              id: {
                items: {
                  type: 'string',
                },
                minItems: 1,
                type: 'array',
              },
            },
            required: ['id'],
            title: 'RequiredFields',
            type: 'object',
          },
          ValidationRules: {
            additionalProperties: true,
            properties: {
              id: {
                pattern: '^[A-Z]{3}-[0-9]{4}$',
                type: 'string',
              },
            },
            title: 'ValidationRules',
            type: 'object',
          },
        },
        $id: 'http://example.org/MultiNodeShape',
        $ref: '#/$defs/MultiNode',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Boundary Cases', () => {
    it('should handle maxCount 0 (property must not exist)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RestrictedShape
            a sh:NodeShape ;
            sh:targetClass ex:Restricted ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] ;
            sh:property [
                sh:path ex:forbidden ;
                sh:datatype xsd:string ;
                sh:maxCount 0 ;
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
              name: {
                items: {
                  type: 'string',
                },
                minItems: 1,
                type: 'array',
              },
              forbidden: false,
            },
            required: ['name'],
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

    it('should handle contradictory minCount > maxCount', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContradictoryShape
            a sh:NodeShape ;
            sh:targetClass ex:Contradictory ;
            sh:property [
                sh:path ex:items ;
                sh:datatype xsd:string ;
                sh:minCount 5 ;
                sh:maxCount 2 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // Should preserve both constraints even if contradictory
      expect(schema).toStrictEqual({
        $defs: {
          Contradictory: {
            title: 'Contradictory',
            type: 'object',
            properties: {
              items: false,
            },
            required: ['items'],
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ContradictoryShape',
        $ref: '#/$defs/Contradictory',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle contradictory minLength > maxLength', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContradictoryStringShape
            a sh:NodeShape ;
            sh:targetClass ex:ContradictoryString ;
            sh:property [
                sh:path ex:code ;
                sh:datatype xsd:string ;
                sh:minLength 10 ;
                sh:maxLength 5 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ContradictoryString: {
            title: 'ContradictoryString',
            type: 'object',
            properties: {
              code: false,
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ContradictoryStringShape',
        $ref: '#/$defs/ContradictoryString',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle contradictory minInclusive > maxInclusive', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContradictoryNumberShape
            a sh:NodeShape ;
            sh:targetClass ex:ContradictoryNumber ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:integer ;
                sh:minInclusive 100 ;
                sh:maxInclusive 50 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ContradictoryNumber: {
            title: 'ContradictoryNumber',
            type: 'object',
            properties: {
              value: false,
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ContradictoryNumberShape',
        $ref: '#/$defs/ContradictoryNumber',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle empty sh:or array', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EmptyOrShape
            a sh:NodeShape ;
            sh:targetClass ex:EmptyOr ;
            sh:property [
                sh:path ex:value ;
                sh:or () ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          EmptyOr: {
            title: 'EmptyOr',
            type: 'object',
            properties: {
              value: {},
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/EmptyOrShape',
        $ref: '#/$defs/EmptyOr',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle minCount 0 and maxCount 0 (effectively forbidden)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ZeroCardinalityShape
            a sh:NodeShape ;
            sh:targetClass ex:ZeroCardinality ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
                sh:minCount 0 ;
                sh:maxCount 0 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ZeroCardinality: {
            title: 'ZeroCardinality',
            type: 'object',
            properties: {
              value: false,
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/ZeroCardinalityShape',
        $ref: '#/$defs/ZeroCardinality',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle single-element arrays (minCount 1, maxCount 1)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SingletonShape
            a sh:NodeShape ;
            sh:targetClass ex:Singleton ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Singleton: {
            additionalProperties: true,
            properties: {
              value: {
                type: 'string',
              },
            },
            required: ['value'],
            title: 'Singleton',
            type: 'object',
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
  });
});
