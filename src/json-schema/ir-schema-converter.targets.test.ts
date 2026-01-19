import { IrSchemaConverter } from './ir-schema-converter';
import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../ir/intermediate-representation-builder';
import { ShaclParser } from '../shacl/shacl-parser';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('IR Schema Converter - Targets', () => {
  describe('Multiple Duplicates (3+)', () => {
    it('should assign sequential numbers for 3+ shapes with same target', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .

        ex:PersonShape3
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person_1: {
            title: 'Person_1',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Person_2: {
            title: 'Person_2',
            type: 'object',
            properties: {
              age: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
          Person_3: {
            title: 'Person_3',
            type: 'object',
            properties: {
              email: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person_1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Multiple Sets of Duplicates', () => {
    it('should number each group of duplicates independently', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .

        ex:OrganizationShape1
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property [
                sh:path ex:orgName ;
                sh:datatype xsd:string ;
            ] .

        ex:OrganizationShape2
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property [
                sh:path ex:taxId ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person_1: {
            title: 'Person_1',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Person_2: {
            title: 'Person_2',
            type: 'object',
            properties: {
              age: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
          Organization_1: {
            title: 'Organization_1',
            type: 'object',
            properties: {
              orgName: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Organization_2: {
            title: 'Organization_2',
            type: 'object',
            properties: {
              taxId: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person_1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Mix of Duplicates and Unique Targets', () => {
    it('should only number duplicate targets, leaving unique ones unchanged', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property [
                sh:path ex:orgName ;
                sh:datatype xsd:string ;
            ] .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person_1: {
            title: 'Person_1',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Person_2: {
            title: 'Person_2',
            type: 'object',
            properties: {
              age: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
          Organization: {
            title: 'Organization',
            type: 'object',
            properties: {
              orgName: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Product: {
            title: 'Product',
            type: 'object',
            properties: {
              price: {
                type: 'number',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person_1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('No Duplicates', () => {
    it('should not number targets when all are unique', async () => {
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
            ] .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property [
                sh:path ex:orgName ;
                sh:datatype xsd:string ;
            ] .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
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
            },
            additionalProperties: true,
          },
          Organization: {
            title: 'Organization',
            type: 'object',
            properties: {
              orgName: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Product: {
            title: 'Product',
            type: 'object',
            properties: {
              price: {
                type: 'number',
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
  });

  describe('Single Shape with Multiple Targets', () => {
    it('should create entries for all targets when shape has multiple targetClass', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonOrEmployeeShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:targetClass ex:Employee ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:AnotherPersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person_1: {
            title: 'Person_1',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Employee: {
            title: 'Employee',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Person_2: {
            title: 'Person_2',
            type: 'object',
            properties: {
              age: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonOrEmployeeShape',
        $ref: '#/$defs/Person_1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should create entries for all targets without numbering when no duplicates', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MultiTargetShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:targetClass ex:Employee ;
            sh:targetClass ex:User ;
            sh:property [
                sh:path ex:id ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Employee: {
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
            title: 'Employee',
            type: 'object',
          },
          Person: {
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
            title: 'Person',
            type: 'object',
          },
          User: {
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
            title: 'User',
            type: 'object',
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

    it('should handle multiple shapes each with multiple targets', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:Shape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:targetClass ex:Employee ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:Shape2
            a sh:NodeShape ;
            sh:targetClass ex:Manager ;
            sh:targetClass ex:Director ;
            sh:property [
                sh:path ex:level ;
                sh:datatype xsd:integer ;
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
            },
            additionalProperties: true,
          },
          Employee: {
            title: 'Employee',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
          Manager: {
            title: 'Manager',
            type: 'object',
            properties: {
              level: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
          Director: {
            title: 'Director',
            type: 'object',
            properties: {
              level: {
                type: 'integer',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/Shape1',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle mix of targetClass and targetNode on same shape', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:MixedTargetShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:targetNode ex:john ;
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
            'x-shacl-targetNodes': ['http://example.org/john'],
          },
          john: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'john',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/john'],
          },
        },
        $id: 'http://example.org/MixedTargetShape',
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

  describe('Other Target Types', () => {
    it('should number duplicate targetNode declarations', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:JohnShape1
            a sh:NodeShape ;
            sh:targetNode ex:john ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:JohnShape2
            a sh:NodeShape ;
            sh:targetNode ex:john ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          john_1: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'john_1',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/john'],
          },
          john_2: {
            additionalProperties: true,
            properties: {
              age: {
                type: 'integer',
              },
            },
            title: 'john_2',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/john'],
          },
        },
        $id: 'http://example.org/JohnShape1',
        $ref: '#/$defs/john_1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should number duplicate targetSubjectsOf declarations', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        ex:alice ex:knows ex:bob .
        ex:charlie ex:knows ex:dave .

        ex:KnowerShape1
            a sh:NodeShape ;
            sh:targetSubjectsOf ex:knows ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:KnowerShape2
            a sh:NodeShape ;
            sh:targetSubjectsOf ex:knows ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          alice: {
            additionalProperties: true,
            title: 'alice',
            type: 'object',
            'x-shacl-knows': 'http://example.org/bob',
          },
          alice_1: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'alice_1',
            type: 'object',
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
          },
          alice_2: {
            additionalProperties: true,
            properties: {
              age: {
                type: 'integer',
              },
            },
            title: 'alice_2',
            type: 'object',
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
          },
          charlie: {
            additionalProperties: true,
            title: 'charlie',
            type: 'object',
            'x-shacl-knows': 'http://example.org/dave',
          },
          charlie_1: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'charlie_1',
            type: 'object',
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
          },
          charlie_2: {
            additionalProperties: true,
            properties: {
              age: {
                type: 'integer',
              },
            },
            title: 'charlie_2',
            type: 'object',
            'x-shacl-targetSubjectsOf': 'http://example.org/knows',
          },
        },
        $id: 'http://example.org/alice',
        $ref: '#/$defs/alice',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should number duplicate targetObjectsOf declarations', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:alice ex:knows ex:bob .
        ex:charlie ex:knows ex:bob .

        ex:KnownShape1
            a sh:NodeShape ;
            sh:targetObjectsOf ex:knows ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:KnownShape2
            a sh:NodeShape ;
            sh:targetObjectsOf ex:knows ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          alice: {
            additionalProperties: true,
            title: 'alice',
            type: 'object',
            'x-shacl-knows': 'http://example.org/bob',
          },
          bob_1: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'bob_1',
            type: 'object',
            'x-shacl-targetObjectsOf': 'http://example.org/knows',
          },
          bob_2: {
            additionalProperties: true,
            properties: {
              age: {
                type: 'integer',
              },
            },
            title: 'bob_2',
            type: 'object',
            'x-shacl-targetObjectsOf': 'http://example.org/knows',
          },
          charlie: {
            additionalProperties: true,
            title: 'charlie',
            type: 'object',
            'x-shacl-knows': 'http://example.org/bob',
          },
        },
        $id: 'http://example.org/alice',
        $ref: '#/$defs/alice',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mix of target types with duplicates', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .

        ex:SpecificPersonShape
            a sh:NodeShape ;
            sh:targetNode ex:Person ;
            sh:property [
                sh:path ex:id ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person_1: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'Person_1',
            type: 'object',
          },
          Person_2: {
            additionalProperties: true,
            properties: {
              age: {
                type: 'integer',
              },
            },
            title: 'Person_2',
            type: 'object',
          },
          Person_3: {
            additionalProperties: true,
            properties: {
              id: {
                type: 'string',
              },
            },
            title: 'Person_3',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/Person'],
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person_1',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });
});
