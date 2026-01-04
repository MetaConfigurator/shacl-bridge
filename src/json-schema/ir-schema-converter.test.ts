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
    expect(schema).toBeUndefined();
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
          required: [],
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
      required: [],
      additionalProperties: false,
    });
  });
});
