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

describe('IR Schema Converter - SHACL Extensions', () => {
  describe('x-shacl-prefixes', () => {
    it('should exclude x-shacl-prefixes by default', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:name ; sh:datatype xsd:string ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
    });

    it('should include x-shacl-prefixes when includeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:name ; sh:datatype xsd:string ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeDefined();
    });
  });

  describe('x-shacl-equals', () => {
    it('should exclude x-shacl-equals by default', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:email ; sh:datatype xsd:string ] ;
            sh:property [ sh:path ex:confirmEmail ; sh:datatype xsd:string ; sh:equals ex:email ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      const confirmEmail = (
        schema.$defs?.Person as { properties?: { confirmEmail?: Record<string, unknown> } }
      ).properties?.confirmEmail;
      expect(confirmEmail?.['x-shacl-equals']).toBeUndefined();
      expect(confirmEmail?.type).toBe('string');
    });

    it('should include x-shacl-equals when includeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:email ; sh:datatype xsd:string ] ;
            sh:property [ sh:path ex:confirmEmail ; sh:datatype xsd:string ; sh:equals ex:email ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();
      const confirmEmail = (
        schema.$defs?.Person as { properties?: { confirmEmail?: Record<string, unknown> } }
      ).properties?.confirmEmail;
      expect(confirmEmail?.['x-shacl-equals']).toBe('email');
    });
  });

  describe('x-shacl-lessThan', () => {
    it('should exclude x-shacl-lessThan by default', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DateRangeShape
            a sh:NodeShape ;
            sh:targetClass ex:DateRange ;
            sh:property [ sh:path ex:startDate ; sh:datatype xsd:date ] ;
            sh:property [ sh:path ex:endDate ; sh:datatype xsd:date ; sh:lessThan ex:startDate ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      const endDate = (
        schema.$defs?.DateRange as { properties?: { endDate?: Record<string, unknown> } }
      ).properties?.endDate;
      expect(endDate?.['x-shacl-lessThan']).toBeUndefined();
      expect(endDate?.format).toBe('date');
    });

    it('should include x-shacl-lessThan when includeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DateRangeShape
            a sh:NodeShape ;
            sh:targetClass ex:DateRange ;
            sh:property [ sh:path ex:startDate ; sh:datatype xsd:date ] ;
            sh:property [ sh:path ex:endDate ; sh:datatype xsd:date ; sh:lessThan ex:startDate ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();
      const endDate = (
        schema.$defs?.DateRange as { properties?: { endDate?: Record<string, unknown> } }
      ).properties?.endDate;
      expect(endDate?.['x-shacl-lessThan']).toBe('startDate');
    });
  });

  describe('x-shacl-sparql', () => {
    it('should exclude x-shacl-sparql by default', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:sparql [ sh:message "Age must be non-negative" ;
                        sh:select "SELECT $this WHERE { $this ex:age ?a . FILTER(?a < 0) }" ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      const person = schema.$defs?.Person as Record<string, unknown>;
      expect(person['x-shacl-sparql']).toBeUndefined();
    });

    it('should include x-shacl-sparql when includeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:sparql [ sh:message "Age must be non-negative" ;
                        sh:select "SELECT $this WHERE { $this ex:age ?a . FILTER(?a < 0) }" ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();
      const person = schema.$defs?.Person as Record<string, unknown>;
      expect(person['x-shacl-sparql']).toBeDefined();
    });
  });

  describe('preserves standard JSON Schema properties', () => {
    it('should preserve all standard JSON Schema properties regardless of includeShaclExtensions', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:name ; sh:datatype xsd:string ; sh:minLength 1 ; sh:maxLength 100 ; sh:minCount 1 ; sh:maxCount 1 ] ;
            sh:property [ sh:path ex:age ; sh:datatype xsd:integer ; sh:minInclusive 0 ; sh:maxInclusive 150 ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$defs).toBeDefined();
      expect(schema['x-shacl-prefixes']).toBeUndefined();

      const person = schema.$defs?.Person as {
        properties?: { name?: Record<string, unknown>; age?: Record<string, unknown> };
        required?: string[];
      };
      expect(person.properties?.name?.type).toBe('string');
      expect(person.properties?.name?.minLength).toBe(1);
      expect(person.properties?.name?.maxLength).toBe(100);
      expect(person.properties?.age?.type).toBe('integer');
      expect(person.properties?.age?.minimum).toBe(0);
      expect(person.properties?.age?.maximum).toBe(150);
      expect(person.required).toContain('name');
    });
  });
});
