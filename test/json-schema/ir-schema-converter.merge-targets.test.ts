import { IrSchemaConverter } from '../../src/json-schema/ir-schema-converter';
import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../../src/ir/intermediate-representation-builder';
import { ShaclParser } from '../../src/shacl/parser/shacl-parser';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('IR Schema Converter - Merge Targets', () => {
  describe('Basic Merging', () => {
    it('should merge two shapes with same targetClass into single schema', async () => {
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
          ] .

      ex:HumanShape
          a sh:NodeShape ;
          sh:targetClass ex:Person ;
          sh:property [
              sh:path ex:age ;
              sh:datatype xsd:integer ;
              sh:minCount 1 ;
              sh:maxCount 1 ;
          ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      // Should create a single Person schema with both name and age properties
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
            required: ['name', 'age'],
            title: 'Person',
            type: 'object',
          },
        },
        $id: 'http://example.org/PersonShape',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should merge three shapes with same targetClass', async () => {
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
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              age: {
                type: 'integer',
              },
              email: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape1',
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

  describe('Multiple Target Groups', () => {
    it('should merge within groups but keep groups separate', async () => {
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
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
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
              taxId: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape1',
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

  describe('Required Fields Merging', () => {
    it('should merge required fields from multiple shapes', async () => {
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
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:PersonShape3
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema.$defs?.Person).toMatchObject({
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'integer' },
        },
        required: ['name', 'email'],
      });
    });
  });

  describe('Mix of Merged and Unique Targets', () => {
    it('should merge duplicates and leave unique targets unchanged', async () => {
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
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
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

  describe('Multiple Targets per Shape', () => {
    it('should handle shape with multiple targets correctly when merged', async () => {
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

      // Person should have both name and age (merged)
      // Employee should have only name (not merged with anything)
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              age: {
                type: 'integer',
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
        },
        $id: 'http://example.org/PersonOrEmployeeShape',
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

  describe('Other Target Types', () => {
    it('should merge shapes with same targetNode', async () => {
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
          john: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
              age: {
                type: 'integer',
              },
            },
            title: 'john',
            type: 'object',
            'x-shacl-targetNodes': ['http://example.org/john'],
          },
        },
        $id: 'http://example.org/JohnShape1',
        $ref: '#/$defs/john',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Closed Shapes', () => {
    it('should handle closed constraint when merging shapes', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:closed true ;
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
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema.$defs?.Person).toMatchObject({
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        // If any shape is closed, the merged shape should be closed
        additionalProperties: false,
      });
    });
  });

  describe('No Duplicates', () => {
    it('should not modify targets when all are unique', async () => {
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

  describe('Multi-Target Shapes', () => {
    it('should create entries for all targets without merging when no duplicates', async () => {
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

  describe('Advanced Target Types', () => {
    it('should merge duplicate targetSubjectsOf declarations', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

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

      // Should have merged schemas for alice and charlie (both subjects of ex:knows)
      expect(schema.$defs?.alice).toMatchObject({
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        'x-shacl-targetSubjectsOf': 'http://example.org/knows',
      });

      expect(schema.$defs?.charlie).toMatchObject({
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        'x-shacl-targetSubjectsOf': 'http://example.org/knows',
      });
    });

    it('should merge duplicate targetObjectsOf declarations', async () => {
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

      // Should have merged schema for bob (object of ex:knows)
      expect(schema.$defs?.bob).toMatchObject({
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        'x-shacl-targetObjectsOf': 'http://example.org/knows',
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mix of target types with merging', async () => {
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
          Person: {
            title: 'Person',
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' },
              id: { type: 'string' },
            },
            additionalProperties: true,
            'x-shacl-targetNodes': ['http://example.org/Person'],
          },
        },
        $id: 'http://example.org/PersonShape1',
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

  describe('Property Conflicts', () => {
    it('should handle same property with different constraints - last wins', async () => {
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
                sh:minLength 5 ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 10 ;
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
                allOf: [
                  {
                    minLength: 5,
                    type: 'string',
                  },
                  {
                    minLength: 10,
                    type: 'string',
                  },
                ],
              },
            },
            required: ['name'],
            title: 'Person',
            type: 'object',
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle same property with different datatypes - last wins', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
                sh:pattern "^[A-Z].*" ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            properties: {
              value: {
                allOf: [
                  {
                    type: 'string',
                  },
                  {
                    pattern: '^[A-Z].*',
                    type: 'string',
                  },
                ],
              },
            },
            required: ['value'],
            title: 'Person',
            type: 'object',
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle same property with different cardinality - last wins', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:minCount 2 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            properties: {
              email: {
                allOf: [
                  {
                    type: 'string',
                  },
                  {
                    items: {
                      type: 'string',
                    },
                    minItems: 2,
                    type: 'array',
                  },
                ],
              },
            },
            required: ['email'],
            title: 'Person',
            type: 'object',
          },
        },
        $id: 'http://example.org/PersonShape1',
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

  describe('Edge Cases', () => {
    it('should handle empty shape merged with shape having properties', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
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
            title: 'Person',
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle both shapes being closed with different properties', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:closed true ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:closed true ;
            sh:property [
                sh:path ex:age ;
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
              age: {
                type: 'integer',
              },
            },
            additionalProperties: false,
          },
        },
        $id: 'http://example.org/PersonShape1',
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle single shape with no target declarations', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

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
        },
        $id: 'http://example.org/PersonShape',
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

  describe('Metadata Preservation', () => {
    it('should preserve shape metadata when merging', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:message "Person validation failed" ;
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
              age: {
                type: 'integer',
              },
            },
            additionalProperties: true,
            'x-shacl-message': {
              datatype: 'http://www.w3.org/2001/XMLSchema#string',
              type: 'literal',
              value: 'Person validation failed',
            },
          },
        },
        $id: 'http://example.org/PersonShape1',
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
});
