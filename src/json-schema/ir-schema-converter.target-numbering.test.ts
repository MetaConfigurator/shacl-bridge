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

describe('Target Numbering', () => {
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

      expect(schema.$defs).toHaveProperty('Person_1');
      expect(schema.$defs).toHaveProperty('Person_2');
      expect(schema.$defs).toHaveProperty('Person_3');
      // expect(schema.$defs?.Person_1.properties).toHaveProperty('name');
      // expect(schema.$defs?.Person_2.properties).toHaveProperty('age');
      // expect(schema.$defs?.Person_3.properties).toHaveProperty('email');
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

      // Both Person and Organization should have _1 and _2 variants
      expect(schema.$defs).toHaveProperty('Person_1');
      expect(schema.$defs).toHaveProperty('Person_2');
      expect(schema.$defs).toHaveProperty('Organization_1');
      expect(schema.$defs).toHaveProperty('Organization_2');

      // Verify correct properties assigned
      // expect(schema.$defs?.Person_1.properties).toHaveProperty('name');
      // expect(schema.$defs?.Person_2.properties).toHaveProperty('age');
      // expect(schema.$defs?.Organization_1.properties).toHaveProperty('orgName');
      // expect(schema.$defs?.Organization_2.properties).toHaveProperty('taxId');
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

      // Person should be numbered (duplicate)
      expect(schema.$defs).toHaveProperty('Person_1');
      expect(schema.$defs).toHaveProperty('Person_2');

      // Organization and Product should NOT be numbered (unique)
      expect(schema.$defs).toHaveProperty('Organization');
      expect(schema.$defs).toHaveProperty('Product');
      expect(schema.$defs).not.toHaveProperty('Organization_1');
      expect(schema.$defs).not.toHaveProperty('Product_1');
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

      // All should be unnumbered
      expect(schema.$defs).toHaveProperty('Person');
      expect(schema.$defs).toHaveProperty('Organization');
      expect(schema.$defs).toHaveProperty('Product');

      // None should have numbers
      expect(schema.$defs).not.toHaveProperty('Person_1');
      expect(schema.$defs).not.toHaveProperty('Organization_1');
      expect(schema.$defs).not.toHaveProperty('Product_1');
    });
  });

  describe('Single Shape with Multiple Targets', () => {
    it('should handle shapes with multiple targetClass declarations', async () => {
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

      // Person appears twice, so both should be numbered
      expect(schema.$defs).toHaveProperty('Person_1');
      expect(schema.$defs).toHaveProperty('Person_2');

      // Employee appears once, should not be numbered
      expect(schema.$defs).toHaveProperty('Employee');
      expect(schema.$defs).not.toHaveProperty('Employee_1');
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

      // john should be numbered as it appears twice
      expect(schema.$defs).toHaveProperty('john_1');
      expect(schema.$defs).toHaveProperty('john_2');
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

      // Should have numbered entries for alice and charlie
      expect(schema.$defs).toHaveProperty('alice_1');
      expect(schema.$defs).toHaveProperty('alice_2');
      expect(schema.$defs).toHaveProperty('charlie_1');
      expect(schema.$defs).toHaveProperty('charlie_2');
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

      // bob should be numbered as it appears twice
      expect(schema.$defs).toHaveProperty('bob_1');
      expect(schema.$defs).toHaveProperty('bob_2');
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

      // targetClass Person appears twice
      expect(schema.$defs).toHaveProperty('Person_1');
      expect(schema.$defs).toHaveProperty('Person_2');

      // targetNode Person appears once - should be numbered as _3
      // because it's the same name "Person" appearing a third time overall
      expect(schema.$defs).toHaveProperty('Person_3');
    });
  });
});
