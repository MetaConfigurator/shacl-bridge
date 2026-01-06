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

describe('ir-schema-converter', () => {
  it('should give empty json schema for empty shacl document', async () => {
    const ir = await getIr('');
    const schema = new IrSchemaConverter(ir).convert();
    expect(schema).toEqual({});
  });

  it('should give a valid json schema without defs and refs for a shacl document with single base shape', async () => {
    const content = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      
      ex:PersonShape
          a sh:NodeShape ;
          sh:targetClass ex:Person ;
          sh:property [
              sh:path ex:name ;
              sh:datatype xsd:string ;
              sh:minCount 1 ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:email ;
              sh:datatype xsd:string ;
              sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.\\\\w+$" ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:age ;
              sh:datatype xsd:integer ;
              sh:minInclusive 0 ;
              sh:maxInclusive 150 ;
              sh:maxCount 1 ;
          ] .
    `;
    const ir = await getIr(content);
    const schema = new IrSchemaConverter(ir).convert();
    expect(schema).toStrictEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'http://example.org/PersonShape',
      title: 'Person',
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
          pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
        },
        age: {
          type: 'integer',
          minimum: 0,
          maximum: 150,
        },
      },
      required: ['name'],
      additionalProperties: true,
    });
  });

  it('should give a valid json schema with defs and refs for a shacl document with multiple base shape', async () => {
    const content = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# Main Person Shape
ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
        sh:minLength 1 ;
        sh:maxLength 100 ;
    ] ;
    sh:property [
        sh:path ex:age ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
        sh:maxInclusive 150 ;
    ] ;
    sh:property [
        sh:path ex:email ;
        sh:node ex:EmailShape ;
        sh:maxCount 1 ;
    ] ;
    sh:property [
        sh:path ex:address ;
        sh:node ex:AddressShape ;
        sh:minCount 1 ;
    ] ;
    sh:property [
        sh:path ex:friends ;
        sh:node ex:PersonReferenceShape ;
    ] .

# Reusable Email Shape
ex:EmailShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:value ;
        sh:datatype xsd:string ;
        sh:pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$" ;
    ] ;
    sh:property [
        sh:path ex:verified ;
        sh:datatype xsd:boolean ;
    ] .

# Reusable Address Shape
ex:AddressShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:street ;
        sh:datatype xsd:string ;
        sh:minLength 1 ;
    ] ;
    sh:property [
        sh:path ex:city ;
        sh:datatype xsd:string ;
        sh:minLength 1 ;
    ] ;
    sh:property [
        sh:path ex:zipCode ;
        sh:datatype xsd:string ;
        sh:pattern "^[0-9]{5}$" ;
    ] ;
    sh:property [
        sh:path ex:country ;
        sh:datatype xsd:string ;
        sh:in ("Germany" "USA" "India" "UK") ;
    ] .

# Reusable Person Reference Shape (for circular references)
ex:PersonReferenceShape
    a sh:NodeShape ;
    sh:property [
        sh:path ex:id ;
        sh:datatype xsd:string ;
        sh:minLength 1 ;
    ] ;
    sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
    ] .
    `;
    const ir = await getIr(content);
    const schema = new IrSchemaConverter(ir).convert();
    expect(schema).toStrictEqual({
      $defs: {
        Address: {
          properties: {
            city: {
              minLength: 1,
              type: 'string',
            },
            country: {
              enum: ['Germany', 'USA', 'India', 'UK'],
              type: 'string',
            },
            street: {
              minLength: 1,
              type: 'string',
            },
            zipCode: {
              pattern: '^[0-9]{5}$',
              type: 'string',
            },
          },
          required: ['street', 'city'],
          title: 'Address',
          type: 'object',
        },
        Email: {
          properties: {
            value: {
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
              type: 'string',
            },
            verified: {
              type: 'boolean',
            },
          },
          title: 'Email',
          type: 'object',
        },
        PersonReference: {
          properties: {
            id: {
              minLength: 1,
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
          required: ['id'],
          title: 'PersonReference',
          type: 'object',
        },
      },
      $id: 'http://example.org/PersonShape',
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      additionalProperties: true,
      properties: {
        address: {
          type: 'array',
          items: {
            $ref: '#/$defs/Address',
          },
          minItems: 1,
        },
        age: {
          maximum: 150,
          minimum: 0,
          type: 'integer',
        },
        email: {
          $ref: '#/$defs/Email',
        },
        friends: {
          type: 'array',
          items: {
            $ref: '#/$defs/PersonReference',
          },
        },
        name: {
          maxLength: 100,
          minLength: 1,
          type: 'string',
        },
      },
      required: ['name', 'address'],
      title: 'Person',
      type: 'object',
    });
  });

  it('should handle a real-world research publication system with complex arrays and nested structures', async () => {
    const content = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      # Main publication shape
      ex:PublicationShape
          a sh:NodeShape ;
          sh:targetClass ex:Publication ;
          sh:property [
              sh:path ex:title ;
              sh:datatype xsd:string ;
              sh:minLength 1 ;
              sh:maxLength 500 ;
          ] ;
          sh:property [
              sh:path ex:abstract ;
              sh:datatype xsd:string ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:authors ;
              sh:node ex:AuthorShape ;
              sh:minCount 1 ;
          ] ;
          sh:property [
              sh:path ex:keywords ;
              sh:datatype xsd:string ;
              sh:minCount 3 ;
              sh:maxCount 10 ;
          ] ;
          sh:property [
              sh:path ex:publicationYear ;
              sh:datatype xsd:integer ;
              sh:minInclusive 1900 ;
              sh:maxInclusive 2100 ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:doi ;
              sh:datatype xsd:string ;
              sh:pattern "^10\\\\.\\\\d{4,}/.*$" ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:citations ;
              sh:node ex:CitationShape ;
          ] .

      # Author shape with affiliation
      ex:AuthorShape
          a sh:NodeShape ;
          sh:property [
              sh:path ex:name ;
              sh:datatype xsd:string ;
              sh:minLength 1 ;
          ] ;
          sh:property [
              sh:path ex:email ;
              sh:datatype xsd:string ;
              sh:pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$" ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:orcid ;
              sh:datatype xsd:string ;
              sh:pattern "^\\\\d{4}-\\\\d{4}-\\\\d{4}-\\\\d{3}[0-9X]$" ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:affiliation ;
              sh:datatype xsd:string ;
              sh:maxCount 1 ;
          ] .

      # Citation reference shape
      ex:CitationShape
          a sh:NodeShape ;
          sh:property [
              sh:path ex:citedTitle ;
              sh:datatype xsd:string ;
              sh:minLength 1 ;
          ] ;
          sh:property [
              sh:path ex:citedYear ;
              sh:datatype xsd:integer ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:citedDoi ;
              sh:datatype xsd:string ;
              sh:maxCount 1 ;
          ] .
    `;
    const ir = await getIr(content);
    const schema = new IrSchemaConverter(ir).convert();
    expect(schema).toStrictEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'http://example.org/PublicationShape',
      title: 'Publication',
      type: 'object',
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
        },
        abstract: {
          type: 'string',
        },
        authors: {
          type: 'array',
          items: {
            $ref: '#/$defs/Author',
          },
          minItems: 1,
        },
        keywords: {
          type: 'array',
          items: {
            type: 'string',
          },
          minItems: 3,
          maxItems: 10,
        },
        publicationYear: {
          type: 'integer',
          minimum: 1900,
          maximum: 2100,
        },
        doi: {
          type: 'string',
          pattern: '^10\\.\\d{4,}/.*$',
        },
        citations: {
          type: 'array',
          items: {
            $ref: '#/$defs/Citation',
          },
        },
      },
      required: ['title', 'authors', 'keywords'],
      additionalProperties: true,
      $defs: {
        Author: {
          type: 'object',
          title: 'Author',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
            },
            email: {
              type: 'string',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            },
            orcid: {
              type: 'string',
              pattern: '^\\d{4}-\\d{4}-\\d{4}-\\d{3}[0-9X]$',
            },
            affiliation: {
              type: 'string',
            },
          },
          required: ['name'],
        },
        Citation: {
          type: 'object',
          title: 'Citation',
          properties: {
            citedTitle: {
              type: 'string',
              minLength: 1,
            },
            citedYear: {
              type: 'integer',
            },
            citedDoi: {
              type: 'string',
            },
          },
          required: ['citedTitle'],
        },
      },
    });
  });

  it('should handle simple SHACL with closed shapes and class references', async () => {
    const content = `
      @prefix ex:   <http://example.org/> .
      @prefix sh:   <http://www.w3.org/ns/shacl#> .
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .
      @prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape
          a                    sh:NodeShape ;
          sh:targetClass       foaf:Person ;
          sh:property          [
                                 sh:path     ex:ssn ;
                                 sh:maxCount 1 ;
                                 sh:datatype xsd:string ;
                                 sh:pattern  "^\\\\d{3}-\\\\d{2}-\\\\d{4}$" ; ] ;
          sh:property          [
                                 sh:path     ex:worksFor ;
                                 sh:class    ex:Company ;
                                 sh:nodeKind sh:IRI ; ] ;
          sh:closed            true ;
          sh:ignoredProperties ( rdf:type ) .
    `;
    const ir = await getIr(content);
    const schema = new IrSchemaConverter(ir).convert();
    expect(schema).toStrictEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'http://example.org/PersonShape',
      title: 'Person',
      type: 'object',
      properties: {
        ssn: {
          type: 'string',
          pattern: '^\\d{3}-\\d{2}-\\d{4}$',
        },
        worksFor: {
          type: 'array',
          items: {
            $ref: '#/$defs/Company',
          },
        },
      },
      additionalProperties: false,
    });
  });

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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/FlexibleShape',
        title: 'FlexibleType',
        type: 'object',
        properties: {
          identifier: {
            anyOf: [
              {
                type: 'string',
                minLength: 5,
              },
              {
                type: 'integer',
                minimum: 1000,
              },
            ],
          },
          name: {
            type: 'string',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/RestrictedShape',
        title: 'RestrictedType',
        type: 'object',
        properties: {
          code: {
            allOf: [
              {
                type: 'string',
                pattern: '^[A-Z]{3}$',
              },
              {
                minLength: 3,
                maxLength: 3,
              },
            ],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ExclusiveShape',
        title: 'ExclusiveType',
        type: 'object',
        properties: {
          contact: {
            oneOf: [
              {
                type: 'string',
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
              },
              {
                type: 'string',
                pattern: '^\\+?[1-9]\\d{1,14}$',
              },
            ],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/NegativeShape',
        title: 'NegativeType',
        type: 'object',
        properties: {
          username: {
            type: 'string',
            not: {
              pattern: '^admin.*',
            },
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ComplexLogicShape',
        title: 'ComplexType',
        type: 'object',
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
                    minimum: 0,
                    maximum: 100,
                  },
                ],
              },
            ],
          },
        },
        additionalProperties: true,
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
          CreditCard: {
            type: 'object',
            title: 'CreditCard',
            properties: {
              cardNumber: {
                type: 'string',
                pattern: '^[0-9]{16}$',
              },
            },
          },
          BankTransfer: {
            type: 'object',
            title: 'BankTransfer',
            properties: {
              iban: {
                type: 'string',
              },
            },
          },
          PayPal: {
            type: 'object',
            title: 'PayPal',
            properties: {
              email: {
                type: 'string',
              },
            },
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PaymentShape',
        title: 'Payment',
        type: 'object',
        properties: {
          method: {
            oneOf: [
              { $ref: '#/$defs/CreditCard' },
              { $ref: '#/$defs/BankTransfer' },
              { $ref: '#/$defs/PayPal' },
            ],
          },
        },
        additionalProperties: true,
      });
    });
  });

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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TagShape',
        title: 'Item',
        type: 'object',
        properties: {
          tags: {
            type: 'string',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/NoteShape',
        title: 'Document',
        type: 'object',
        properties: {
          notes: {
            type: 'string',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/AuthorShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/CategoryShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/DescriptionShape',
        title: 'Item',
        type: 'object',
        properties: {
          description: {
            type: 'string',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ProjectShape',
        title: 'Project',
        type: 'object',
        properties: {
          members: {
            type: 'array',
            items: {
              $ref: '#/$defs/Person',
            },
          },
        },
        additionalProperties: true,
        $defs: {
          Person: {
            type: 'object',
            title: 'Person',
            properties: {
              name: {
                type: 'string',
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/BatchShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PersonShape',
        title: 'Person',
        type: 'object',
        properties: {
          address: {
            type: 'array',
            items: {
              $ref: '#/$defs/USAddress',
            },
            minItems: 1,
          },
        },
        required: ['address'],
        additionalProperties: true,
        $defs: {
          USAddress: {
            type: 'object',
            title: 'USAddress',
            properties: {
              state: {
                type: 'string',
                pattern: '^[A-Z]{2}$',
              },
              zipCode: {
                type: 'string',
                pattern: '^[0-9]{5}$',
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/CompanyShape',
        title: 'Company',
        type: 'object',
        properties: {
          office: {
            type: 'array',
            items: {
              $ref: '#/$defs/Headquarters',
            },
            maxItems: 1,
          },
        },
        additionalProperties: true,
        $defs: {
          Headquarters: {
            type: 'object',
            title: 'Headquarters',
            properties: {
              isHeadquarters: {
                type: 'boolean',
                const: true,
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TeamShape',
        title: 'Team',
        type: 'object',
        properties: {
          member: {
            type: 'array',
            items: {
              $ref: '#/$defs/Leader',
            },
            minItems: 1,
            maxItems: 3,
          },
        },
        required: ['member'],
        additionalProperties: true,
        $defs: {
          Leader: {
            type: 'object',
            title: 'Leader',
            properties: {
              role: {
                type: 'string',
                enum: ['TeamLead', 'TechLead', 'Manager'],
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ProductShape',
        title: 'Product',
        type: 'object',
        properties: {
          productId: {
            anyOf: [
              { type: 'string', pattern: '^[A-Z]{3}-[0-9]{4}$' },
              { type: 'integer', minimum: 1000 },
            ],
          },
        },
        required: ['productId'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TaxPayerShape',
        title: 'TaxPayer',
        type: 'object',
        properties: {
          taxId: {
            anyOf: [{ type: 'integer' }, { type: 'string', format: 'uri' }],
          },
        },
        required: ['taxId'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PublicationShape',
        title: 'Publication',
        type: 'object',
        properties: {
          publishedDate: {
            anyOf: [
              { type: 'string', format: 'date' },
              { type: 'string', format: 'date-time' },
              { type: 'string' },
            ],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ApiResponseShape',
        title: 'ApiResponse',
        type: 'object',
        properties: {
          result: {
            anyOf: [
              { type: 'string' },
              { type: 'integer' },
              { type: 'boolean' },
              { $ref: '#/$defs/ErrorObject' },
            ],
          },
        },
        additionalProperties: true,
        $defs: {
          ErrorObject: {
            type: 'object',
            title: 'ErrorObject',
            properties: {
              code: {
                type: 'integer',
              },
              message: {
                type: 'string',
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/UserShape',
        title: 'User',
        type: 'object',
        properties: {
          email: {
            allOf: [
              { type: 'string' },
              {
                anyOf: [{ pattern: '.*@company.com$' }, { pattern: '.*@partner.org$' }],
              },
            ],
          },
        },
        required: ['email'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ParticipantShape',
        title: 'Participant',
        type: 'object',
        properties: {
          age: {
            anyOf: [
              {
                allOf: [{ type: 'integer' }, { minimum: 18 }, { maximum: 65 }],
              },
              {
                allOf: [{ type: 'string' }, { enum: ['minor-with-guardian', 'senior-exempt'] }],
              },
            ],
          },
        },
        required: ['age'],
        additionalProperties: true,
      });
    });

    it('should handle file upload with type and size constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:FileUploadShape
            a sh:NodeShape ;
            sh:targetClass ex:FileUpload ;
            sh:property [
                sh:path ex:mimeType ;
                sh:not [
                    sh:or (
                        [ sh:pattern "^application/x-.*" ]
                        [ sh:pattern "^application/.*executable.*" ]
                    )
                ] ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/FileUploadShape',
        title: 'FileUpload',
        type: 'object',
        properties: {
          mimeType: {
            not: {
              anyOf: [{ pattern: '^application/x-.*' }, { pattern: '^application/.*executable.*' }],
            },
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/LocationShape',
        title: 'Location',
        type: 'object',
        properties: {
          address: {
            oneOf: [
              {
                allOf: [
                  { $ref: '#/$defs/StructuredAddress' },
                  {
                    anyOf: [{ $ref: '#/$defs/USAddress' }, { $ref: '#/$defs/EUAddress' }],
                  },
                ],
              },
              {
                allOf: [{ type: 'string' }, { minLength: 10 }, { maxLength: 200 }],
              },
            ],
          },
        },
        additionalProperties: true,
        $defs: {
          StructuredAddress: {
            type: 'object',
            title: 'StructuredAddress',
            properties: {
              street: {
                type: 'string',
              },
            },
          },
          USAddress: {
            type: 'object',
            title: 'USAddress',
            properties: {
              zipCode: {
                type: 'string',
                pattern: '^[0-9]{5}$',
              },
            },
          },
          EUAddress: {
            type: 'object',
            title: 'EUAddress',
            properties: {
              postalCode: {
                type: 'string',
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/AccountShape',
        title: 'Account',
        type: 'object',
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            pattern: '^[a-zA-Z0-9_-]+$',
          },
        },
        required: ['username'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ContactShape',
        title: 'Contact',
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern:
              "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
            maxLength: 254,
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/WebResourceShape',
        title: 'WebResource',
        type: 'object',
        properties: {
          url: {
            type: 'string',
            pattern: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$',
            minLength: 10,
            maxLength: 2048,
          },
        },
        required: ['url'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ResourceShape',
        title: 'Resource',
        type: 'object',
        properties: {
          id: {
            type: 'string',
            pattern:
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
            minLength: 36,
            maxLength: 36,
          },
        },
        required: ['id'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TemperatureShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PercentageShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ScoreShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/EventShape',
        title: 'Event',
        type: 'object',
        properties: {
          eventDate: {
            type: 'string',
            format: 'date',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/BalanceShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PersonShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/DateRangeShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/DocumentShape',
        title: 'Document',
        type: 'object',
        properties: {
          externalLink: {
            type: 'string',
            format: 'uri',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/MetadataShape',
        title: 'Metadata',
        type: 'object',
        properties: {
          description: {
            type: ['string', 'number', 'boolean'],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ArticleShape',
        title: 'Article',
        type: 'object',
        properties: {
          author: {
            type: 'object',
          },
        },
        required: ['author'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/EntityShape',
        title: 'Entity',
        type: 'object',
        properties: {
          relatedTo: {
            oneOf: [{ type: 'object' }, { type: 'string', format: 'uri' }],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ContentShape',
        title: 'Content',
        type: 'object',
        properties: {
          value: {
            oneOf: [{ type: 'object' }, { type: ['string', 'number', 'boolean'] }],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/IdentifierShape',
        title: 'Thing',
        type: 'object',
        properties: {
          identifier: {
            oneOf: [{ type: 'string', format: 'uri' }, { type: ['string', 'number', 'boolean'] }],
          },
        },
        required: ['identifier'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/StrictPersonShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TypedPersonShape',
        title: 'TypedPerson',
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
        additionalProperties: false,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/FlexiblePersonShape',
        title: 'FlexiblePerson',
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/SingletonShape',
        title: 'Singleton',
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active'],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/MixedEnumShape',
        title: 'MixedEnum',
        type: 'object',
        properties: {
          value: {
            enum: ['low', 'medium', 'high', '1', '2', '3'],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/CategoryShape',
        title: 'Document',
        type: 'object',
        properties: {
          category: {
            enum: [
              'http://example.org/Science',
              'http://example.org/Technology',
              'http://example.org/Engineering',
              'http://example.org/Mathematics',
            ],
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PriorityShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/UserShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ConfigShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TaskShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/SettingsShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ProductShape',
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
      });
    });
  });

  describe('Real-world Complex Scenarios', () => {
    it('should handle e-commerce product with variants and complex constraints', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:closed true ;
            sh:property [
                sh:path ex:sku ;
                sh:datatype xsd:string ;
                sh:pattern "^[A-Z]{3}-[0-9]{6}$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
                sh:maxLength 100 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:stock ;
                sh:datatype xsd:integer ;
                sh:minInclusive 0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:variants ;
                sh:node ex:VariantShape ;
            ] ;
            sh:property [
                sh:path ex:tags ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] .

        ex:VariantShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:color ;
                sh:datatype xsd:string ;
                sh:in ( "red" "blue" "green" "black" "white" ) ;
            ] ;
            sh:property [
                sh:path ex:size ;
                sh:datatype xsd:string ;
                sh:in ( "XS" "S" "M" "L" "XL" "XXL" ) ;
            ] ;
            sh:property [
                sh:path ex:additionalPrice ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 0.0 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ProductShape',
        title: 'Product',
        type: 'object',
        properties: {
          sku: {
            type: 'string',
            pattern: '^[A-Z]{3}-[0-9]{6}$',
          },
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 100,
          },
          price: {
            type: 'number',
            exclusiveMinimum: 0.0,
          },
          stock: {
            type: 'integer',
            minimum: 0,
          },
          variants: {
            type: 'array',
            items: {
              $ref: '#/$defs/Variant',
            },
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            minItems: 1,
          },
        },
        required: ['sku', 'name', 'price', 'stock', 'tags'],
        additionalProperties: false,
        $defs: {
          Variant: {
            type: 'object',
            title: 'Variant',
            properties: {
              color: {
                type: 'string',
                enum: ['red', 'blue', 'green', 'black', 'white'],
              },
              size: {
                type: 'string',
                enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
              },
              additionalPrice: {
                type: 'number',
                minimum: 0.0,
              },
            },
          },
        },
      });
    });

    it('should handle organization hierarchy with departments', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:headquarters ;
                sh:node ex:AddressShape ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:departments ;
                sh:node ex:DepartmentShape ;
                sh:minCount 1 ;
            ] .

        ex:AddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:street ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:city ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:country ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:DepartmentShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:headCount ;
                sh:datatype xsd:integer ;
                sh:minInclusive 1 ;
            ] ;
            sh:property [
                sh:path ex:budget ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 0.0 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/OrganizationShape',
        title: 'Organization',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
          },
          headquarters: {
            $ref: '#/$defs/Address',
          },
          departments: {
            type: 'array',
            items: {
              $ref: '#/$defs/Department',
            },
            minItems: 1,
          },
        },
        required: ['name', 'headquarters', 'departments'],
        additionalProperties: true,
        $defs: {
          Address: {
            type: 'object',
            title: 'Address',
            properties: {
              street: {
                type: 'string',
              },
              city: {
                type: 'string',
              },
              country: {
                type: 'string',
              },
            },
            required: ['country'],
          },
          Department: {
            type: 'object',
            title: 'Department',
            properties: {
              name: {
                type: 'string',
              },
              headCount: {
                type: 'integer',
                minimum: 1,
              },
              budget: {
                type: 'number',
                minimum: 0.0,
              },
            },
            required: ['name'],
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/MultilingualShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/LocalizedContentShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/VersionRangeShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ProductShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/PersonShape',
        title: 'Person',
        type: 'object',
        'x-shacl-message': 'Person validation failed',
        properties: {
          email: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            'x-shacl-message': 'Email must be a valid email address',
          },
        },
        required: ['email'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/DataQualityShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ValidationShape',
        title: 'ValidationTest',
        type: 'object',
        'x-shacl-message': 'Shape validation constraints not met',
        'x-shacl-severity': 'sh:Violation',
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            'x-shacl-message': 'Username must be between 3 and 20 characters',
            'x-shacl-severity': 'sh:Warning',
          },
        },
        required: ['username'],
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/DeprecatedShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/UserShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ActiveShape',
        title: 'ActiveUser',
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
        additionalProperties: true,
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/OrganizationShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/TeamShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/RoleShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ContactShape',
        title: 'Contact',
        type: 'object',
        properties: {
          address: {
            type: 'array',
            items: {
              anyOf: [{ $ref: '#/$defs/HomeAddress' }, { $ref: '#/$defs/WorkAddress' }],
            },
            maxItems: 1,
            'x-shacl-qualifiedValueShapesDisjoint': true,
          },
        },
        additionalProperties: true,
        $defs: {
          HomeAddress: {
            type: 'object',
            title: 'HomeAddress',
            properties: {
              type: {
                const: 'home',
              },
            },
          },
          WorkAddress: {
            type: 'object',
            title: 'WorkAddress',
            properties: {
              type: {
                const: 'work',
              },
            },
          },
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/SpecificNodeShape',
        title: 'Node1',
        type: 'object',
        properties: {
          value: {
            type: 'string',
          },
        },
        required: ['value'],
        additionalProperties: true,
        'x-shacl-targetNodes': [
          'http://example.org/Node1',
          'http://example.org/Node2',
          'http://example.org/Node3',
        ],
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/ObjectTargetShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/SubjectTargetShape',
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
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'http://example.org/MultiTargetShape',
        title: 'Person',
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
          },
        },
        required: ['identifier'],
        additionalProperties: true,
        'x-shacl-targetNodes': ['http://example.org/SpecialPerson'],
        'x-shacl-targetSubjectsOf': 'http://example.org/knows',
      });
    });
  });
});
