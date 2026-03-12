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

describe('IR Schema Converter - Structure', () => {
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
      $defs: {
        Person: {
          additionalProperties: true,
          properties: {
            age: {
              maximum: 150,
              minimum: 0,
              type: 'integer',
            },
            email: {
              pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
          required: ['name'],
          title: 'Person',
          type: 'object',
        },
      },
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      'x-shacl-prefixes': {
        sh: 'http://www.w3.org/ns/shacl#',
        ex: 'http://example.org/',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
      },
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
          additionalProperties: true,
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
          additionalProperties: true,
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
        Person: {
          additionalProperties: true,
          properties: {
            address: {
              items: {
                $ref: '#/$defs/Address',
              },
              minItems: 1,
              type: 'array',
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
              items: {
                $ref: '#/$defs/PersonReference',
              },
              type: 'array',
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
        },
        PersonReference: {
          additionalProperties: true,
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
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      'x-shacl-prefixes': {
        sh: 'http://www.w3.org/ns/shacl#',
        ex: 'http://example.org/',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
      },
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
      $defs: {
        Author: {
          additionalProperties: true,
          properties: {
            affiliation: {
              type: 'string',
            },
            email: {
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
              type: 'string',
            },
            name: {
              minLength: 1,
              type: 'string',
            },
            orcid: {
              pattern: '^\\d{4}-\\d{4}-\\d{4}-\\d{3}[0-9X]$',
              type: 'string',
            },
          },
          required: ['name'],
          title: 'Author',
          type: 'object',
        },
        Citation: {
          additionalProperties: true,
          properties: {
            citedDoi: {
              type: 'string',
            },
            citedTitle: {
              minLength: 1,
              type: 'string',
            },
            citedYear: {
              type: 'integer',
            },
          },
          required: ['citedTitle'],
          title: 'Citation',
          type: 'object',
        },
        Publication: {
          additionalProperties: true,
          properties: {
            abstract: {
              type: 'string',
            },
            authors: {
              items: {
                $ref: '#/$defs/Author',
              },
              minItems: 1,
              type: 'array',
            },
            citations: {
              items: {
                $ref: '#/$defs/Citation',
              },
              type: 'array',
            },
            doi: {
              pattern: '^10\\.\\d{4,}/.*$',
              type: 'string',
            },
            keywords: {
              items: {
                type: 'string',
              },
              maxItems: 10,
              minItems: 3,
              type: 'array',
            },
            publicationYear: {
              maximum: 2100,
              minimum: 1900,
              type: 'integer',
            },
            title: {
              maxLength: 500,
              minLength: 1,
              type: 'string',
            },
          },
          required: ['title', 'authors', 'keywords'],
          title: 'Publication',
          type: 'object',
        },
      },
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      'x-shacl-prefixes': {
        sh: 'http://www.w3.org/ns/shacl#',
        ex: 'http://example.org/',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
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
      $defs: {
        Person: {
          additionalProperties: false,
          properties: {
            ssn: {
              pattern: '^\\d{3}-\\d{2}-\\d{4}$',
              type: 'string',
            },
            worksFor: {
              items: {
                $ref: '#/$defs/Company',
              },
              type: 'array',
            },
          },
          title: 'Person',
          type: 'object',
          'x-shacl-ignoredProperties': ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
        },
      },
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      'x-shacl-prefixes': {
        ex: 'http://example.org/',
        sh: 'http://www.w3.org/ns/shacl#',
        foaf: 'http://xmlns.com/foaf/0.1/',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
      },
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
        $defs: {
          Product: {
            additionalProperties: false,
            properties: {
              name: {
                maxLength: 100,
                minLength: 3,
                type: 'string',
              },
              price: {
                exclusiveMinimum: 0,
                type: 'number',
              },
              sku: {
                pattern: '^[A-Z]{3}-[0-9]{6}$',
                type: 'string',
              },
              stock: {
                minimum: 0,
                type: 'integer',
              },
              tags: {
                items: {
                  type: 'string',
                },
                minItems: 1,
                type: 'array',
              },
              variants: {
                items: {
                  $ref: '#/$defs/Variant',
                },
                type: 'array',
              },
            },
            required: ['sku', 'name', 'price', 'stock', 'tags'],
            title: 'Product',
            type: 'object',
          },
          Variant: {
            additionalProperties: true,
            properties: {
              additionalPrice: {
                minimum: 0,
                type: 'number',
              },
              color: {
                enum: ['red', 'blue', 'green', 'black', 'white'],
                type: 'string',
              },
              size: {
                enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                type: 'string',
              },
            },
            title: 'Variant',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
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
        $defs: {
          Address: {
            additionalProperties: true,
            properties: {
              city: {
                type: 'string',
              },
              country: {
                type: 'string',
              },
              street: {
                type: 'string',
              },
            },
            required: ['country'],
            title: 'Address',
            type: 'object',
          },
          Department: {
            additionalProperties: true,
            properties: {
              budget: {
                minimum: 0,
                type: 'number',
              },
              headCount: {
                minimum: 1,
                type: 'integer',
              },
              name: {
                type: 'string',
              },
            },
            required: ['name'],
            title: 'Department',
            type: 'object',
          },
          Organization: {
            additionalProperties: true,
            properties: {
              departments: {
                items: {
                  $ref: '#/$defs/Department',
                },
                minItems: 1,
                type: 'array',
              },
              headquarters: {
                $ref: '#/$defs/Address',
              },
              name: {
                minLength: 1,
                type: 'string',
              },
            },
            required: ['name', 'headquarters', 'departments'],
            title: 'Organization',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Circular and Recursive Shape References', () => {
    it('should handle self-referencing shapes (Person with friends)', async () => {
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
                sh:path ex:friends ;
                sh:class ex:Person ;
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
                type: 'string',
              },
              friends: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Person',
                },
              },
            },
            required: ['name'],
            additionalProperties: true,
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle mutual circular references (A → B → A)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ParentShape
            a sh:NodeShape ;
            sh:targetClass ex:Parent ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:children ;
                sh:class ex:Child ;
            ] .

        ex:ChildShape
            a sh:NodeShape ;
            sh:targetClass ex:Child ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:parent ;
                sh:class ex:Parent ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Child: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
              parent: {
                $ref: '#/$defs/Parent',
              },
            },
            title: 'Child',
            type: 'object',
          },
          Parent: {
            additionalProperties: true,
            properties: {
              children: {
                items: {
                  $ref: '#/$defs/Child',
                },
                type: 'array',
              },
              name: {
                type: 'string',
              },
            },
            title: 'Parent',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Deeply Nested Structures', () => {
    it('should handle shapes nested 4+ levels deep', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:CompanyShape
            a sh:NodeShape ;
            sh:targetClass ex:Company ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:headquarters ;
                sh:node ex:OfficeShape ;
                sh:maxCount 1 ;
            ] .

        ex:OfficeShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:building ;
                sh:node ex:BuildingShape ;
            ] .

        ex:BuildingShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:address ;
                sh:node ex:AddressShape ;
                sh:minCount 1 ;
            ] .

        ex:AddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:street ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:city ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:coordinates ;
                sh:node ex:CoordinatesShape ;
            ] .

        ex:CoordinatesShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:latitude ;
                sh:datatype xsd:decimal ;
                sh:minInclusive -90.0 ;
                sh:maxInclusive 90.0 ;
            ] ;
            sh:property [
                sh:path ex:longitude ;
                sh:datatype xsd:decimal ;
                sh:minInclusive -180.0 ;
                sh:maxInclusive 180.0 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Address: {
            additionalProperties: true,
            properties: {
              city: {
                type: 'string',
              },
              coordinates: {
                items: {
                  $ref: '#/$defs/Coordinates',
                },
                type: 'array',
              },
              street: {
                type: 'string',
              },
            },
            required: ['street', 'city'],
            title: 'Address',
            type: 'object',
          },
          Building: {
            additionalProperties: true,
            properties: {
              address: {
                items: {
                  $ref: '#/$defs/Address',
                },
                minItems: 1,
                type: 'array',
              },
            },
            required: ['address'],
            title: 'Building',
            type: 'object',
          },
          Company: {
            additionalProperties: true,
            properties: {
              headquarters: {
                $ref: '#/$defs/Office',
              },
              name: {
                type: 'string',
              },
            },
            required: ['name'],
            title: 'Company',
            type: 'object',
          },
          Coordinates: {
            additionalProperties: true,
            properties: {
              latitude: {
                maximum: 90,
                minimum: -90,
                type: 'number',
              },
              longitude: {
                maximum: 180,
                minimum: -180,
                type: 'number',
              },
            },
            title: 'Coordinates',
            type: 'object',
          },
          Office: {
            additionalProperties: true,
            properties: {
              building: {
                items: {
                  $ref: '#/$defs/Building',
                },
                type: 'array',
              },
            },
            title: 'Office',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle circular references between named shapes', async () => {
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
                sh:path ex:employer ;
                sh:node ex:CompanyShape ;
                sh:maxCount 1 ;
            ] .

        ex:CompanyShape
            a sh:NodeShape ;
            sh:targetClass ex:Company ;
            sh:property [
                sh:path ex:companyName ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:employees ;
                sh:node ex:EmployeeShape ;
            ] .

        ex:EmployeeShape
            a sh:NodeShape ;
            sh:targetClass ex:Employee ;
            sh:property [
                sh:path ex:employeeId ;
                sh:datatype xsd:string ;
                sh:pattern "^EMP-[0-9]{6}$" ;
            ] ;
            sh:property [
                sh:path ex:person ;
                sh:node ex:PersonShape ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Company: {
            additionalProperties: true,
            properties: {
              companyName: {
                type: 'string',
              },
              employees: {
                items: {
                  $ref: '#/$defs/Employee',
                },
                type: 'array',
              },
            },
            required: ['companyName'],
            title: 'Company',
            type: 'object',
          },
          Employee: {
            additionalProperties: true,
            properties: {
              employeeId: {
                pattern: '^EMP-[0-9]{6}$',
                type: 'string',
              },
              person: {
                $ref: '#/$defs/Person',
              },
            },
            title: 'Employee',
            type: 'object',
          },
          Person: {
            additionalProperties: true,
            properties: {
              employer: {
                $ref: '#/$defs/Company',
              },
              name: {
                type: 'string',
              },
            },
            required: ['name'],
            title: 'Person',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle multiple root shapes sharing same nested shape definitions', async () => {
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
            ] ;
            sh:property [
                sh:path ex:address ;
                sh:node ex:AddressShape ;
            ] .

        ex:CompanyShape
            a sh:NodeShape ;
            sh:targetClass ex:Company ;
            sh:property [
                sh:path ex:companyName ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path ex:headquarters ;
                sh:node ex:AddressShape ;
                sh:maxCount 1 ;
            ] .

        ex:AddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:street ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
            ] ;
            sh:property [
                sh:path ex:zipCode ;
                sh:datatype xsd:string ;
                sh:pattern "^[0-9]{5}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      // AddressShape should appear only once in $defs despite being referenced by both shapes
      expect(schema.$defs?.Address).toBeDefined();
      expect(schema).toStrictEqual({
        $defs: {
          Address: {
            additionalProperties: true,
            properties: {
              street: {
                minLength: 1,
                type: 'string',
              },
              zipCode: {
                pattern: '^[0-9]{5}$',
                type: 'string',
              },
            },
            required: ['street'],
            title: 'Address',
            type: 'object',
          },
          Company: {
            additionalProperties: true,
            properties: {
              companyName: {
                type: 'string',
              },
              headquarters: {
                $ref: '#/$defs/Address',
              },
            },
            title: 'Company',
            type: 'object',
          },
          Person: {
            additionalProperties: true,
            properties: {
              address: {
                items: {
                  $ref: '#/$defs/Address',
                },
                type: 'array',
              },
              name: {
                type: 'string',
              },
            },
            title: 'Person',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Form Validation Patterns', () => {
    it('should handle registration form with password confirmation', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RegistrationFormShape
            a sh:NodeShape ;
            sh:targetClass ex:RegistrationForm ;
            sh:property [
                sh:path ex:username ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
                sh:maxLength 20 ;
                sh:pattern "^[a-zA-Z0-9_]+$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:password ;
                sh:datatype xsd:string ;
                sh:minLength 8 ;
                sh:maxLength 128 ;
                sh:pattern "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\\\d).*$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:confirmPassword ;
                sh:datatype xsd:string ;
                sh:equals ex:password ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
                sh:minInclusive 18 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:termsAccepted ;
                sh:datatype xsd:boolean ;
                sh:hasValue true ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          RegistrationForm: {
            title: 'RegistrationForm',
            type: 'object',
            properties: {
              username: {
                type: 'string',
                minLength: 3,
                maxLength: 20,
                pattern: '^[a-zA-Z0-9_]+$',
              },
              email: {
                type: 'string',
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
              },
              password: {
                type: 'string',
                minLength: 8,
                maxLength: 128,
                pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$',
              },
              confirmPassword: {
                type: 'string',
                'x-shacl-equals': 'password',
              },
              age: {
                type: 'integer',
                minimum: 18,
              },
              termsAccepted: {
                type: 'boolean',
                const: true,
              },
            },
            required: ['username', 'email', 'password', 'confirmPassword', 'termsAccepted'],
            additionalProperties: true,
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle conditional required fields with logical operators', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ShippingFormShape
            a sh:NodeShape ;
            sh:targetClass ex:ShippingForm ;
            sh:property [
                sh:path ex:shippingMethod ;
                sh:datatype xsd:string ;
                sh:in ( "standard" "express" "pickup" ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:deliveryAddress ;
                sh:node ex:AddressShape ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:storeLocation ;
                sh:datatype xsd:string ;
                sh:maxCount 1 ;
            ] .

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
                sh:path ex:postalCode ;
                sh:datatype xsd:string ;
                sh:pattern "^[0-9]{5}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          Address: {
            additionalProperties: true,
            properties: {
              city: {
                minLength: 1,
                type: 'string',
              },
              postalCode: {
                pattern: '^[0-9]{5}$',
                type: 'string',
              },
              street: {
                minLength: 1,
                type: 'string',
              },
            },
            required: ['street', 'city'],
            title: 'Address',
            type: 'object',
          },
          ShippingForm: {
            additionalProperties: true,
            properties: {
              deliveryAddress: {
                $ref: '#/$defs/Address',
              },
              shippingMethod: {
                enum: ['standard', 'express', 'pickup'],
                type: 'string',
              },
              storeLocation: {
                type: 'string',
              },
            },
            required: ['shippingMethod'],
            title: 'ShippingForm',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle contact form with flexible contact methods', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContactFormShape
            a sh:NodeShape ;
            sh:targetClass ex:ContactForm ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:maxLength 100 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:contactMethod ;
                sh:xone (
                    [ sh:node ex:EmailContactShape ]
                    [ sh:node ex:PhoneContactShape ]
                ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:message ;
                sh:datatype xsd:string ;
                sh:minLength 10 ;
                sh:maxLength 1000 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:EmailContactShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ;
            ] .

        ex:PhoneContactShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:phone ;
                sh:datatype xsd:string ;
                sh:pattern "^\\\\+?[1-9]\\\\d{1,14}$" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema).toStrictEqual({
        $defs: {
          ContactForm: {
            additionalProperties: true,
            properties: {
              contactMethod: {
                oneOf: [
                  {
                    $ref: '#/$defs/EmailContact',
                  },
                  {
                    $ref: '#/$defs/PhoneContact',
                  },
                ],
              },
              message: {
                maxLength: 1000,
                minLength: 10,
                type: 'string',
              },
              name: {
                maxLength: 100,
                minLength: 1,
                type: 'string',
              },
            },
            required: ['name', 'contactMethod', 'message'],
            title: 'ContactForm',
            type: 'object',
          },
          EmailContact: {
            additionalProperties: true,
            properties: {
              email: {
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
                type: 'string',
              },
            },
            title: 'EmailContact',
            type: 'object',
          },
          PhoneContact: {
            additionalProperties: true,
            properties: {
              phone: {
                pattern: '^\\+?[1-9]\\d{1,14}$',
                type: 'string',
              },
            },
            title: 'PhoneContact',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Named sh:property references', () => {
    it('should assemble named PropertyShapes into parent NodeShape and exclude them from top-level $defs', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:NameProperty
            a sh:PropertyShape ;
            sh:path ex:name ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
            sh:maxCount 1 .

        ex:AgeProperty
            a sh:PropertyShape ;
            sh:path ex:age ;
            sh:datatype xsd:integer ;
            sh:maxCount 1 .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property ex:NameProperty ;
            sh:property ex:AgeProperty .
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
              age: {
                type: 'integer',
              },
            },
            required: ['name'],
            title: 'Person',
            type: 'object',
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should render named PropertyShape as a value schema (not type:object)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EmailProperty
            a sh:PropertyShape ;
            sh:path ex:email ;
            sh:datatype xsd:string ;
            sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.\\\\w+$" ;
            sh:maxCount 1 .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property ex:EmailProperty .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      const personDef = (schema.$defs as Record<string, unknown>).Person as Record<string, unknown>;
      const emailProp = (personDef.properties as Record<string, unknown>).email as Record<
        string,
        unknown
      >;
      expect(emailProp.type).toBe('string');
      expect(emailProp.type).not.toBe('object');
      expect(emailProp.pattern).toBe('^[\\w.-]+@[\\w.-]+\\.\\w+$');
      expect(schema.$defs).not.toHaveProperty('EmailProperty');
    });
  });
});
