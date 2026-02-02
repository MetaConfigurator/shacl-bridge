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

describe('IR Schema Converter - Exclude SHACL Extensions', () => {
  describe('x-shacl-prefixes', () => {
    it('should include x-shacl-prefixes by default', async () => {
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
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();
      expect(schema['x-shacl-prefixes']).toBeDefined();
    });

    it('should exclude x-shacl-prefixes when excludeShaclExtensions is true', async () => {
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
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
    });
  });

  describe('x-shacl-equals', () => {
    it('should exclude x-shacl-equals when excludeShaclExtensions is true', async () => {
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
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
      const confirmEmailProperty = (
        schema.$defs?.Person as { properties?: { confirmEmail?: Record<string, unknown> } }
      ).properties?.confirmEmail;
      expect(confirmEmailProperty?.['x-shacl-equals']).toBeUndefined();
      expect(confirmEmailProperty?.type).toBe('string');
    });
  });

  describe('x-shacl-lessThan', () => {
    it('should exclude x-shacl-lessThan when excludeShaclExtensions is true', async () => {
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
            ] ;
            sh:property [
                sh:path ex:endDate ;
                sh:datatype xsd:date ;
                sh:lessThan ex:startDate ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
      const endDateProperty = (
        schema.$defs?.DateRange as { properties?: { endDate?: Record<string, unknown> } }
      ).properties?.endDate;
      expect(endDateProperty?.['x-shacl-lessThan']).toBeUndefined();
      expect(endDateProperty?.format).toBe('date');
    });
  });

  describe('x-shacl-lessThanOrEquals', () => {
    it('should exclude x-shacl-lessThanOrEquals when excludeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RangeShape
            a sh:NodeShape ;
            sh:targetClass ex:Range ;
            sh:property [
                sh:path ex:min ;
                sh:datatype xsd:integer ;
            ] ;
            sh:property [
                sh:path ex:max ;
                sh:datatype xsd:integer ;
                sh:lessThanOrEquals ex:min ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
      const maxProperty = (
        schema.$defs?.Range as { properties?: { max?: Record<string, unknown> } }
      ).properties?.max;
      expect(maxProperty?.['x-shacl-lessThanOrEquals']).toBeUndefined();
    });
  });

  describe('x-shacl-disjoint', () => {
    it('should exclude x-shacl-disjoint when excludeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UniqueValuesShape
            a sh:NodeShape ;
            sh:targetClass ex:UniqueValues ;
            sh:property [
                sh:path ex:primary ;
                sh:datatype xsd:string ;
                sh:disjoint ex:secondary ;
            ] ;
            sh:property [
                sh:path ex:secondary ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
      const primaryProperty = (
        schema.$defs?.UniqueValues as { properties?: { primary?: Record<string, unknown> } }
      ).properties?.primary;
      expect(primaryProperty?.['x-shacl-disjoint']).toBeUndefined();
    });
  });

  describe('x-shacl-sparql', () => {
    it('should exclude x-shacl-sparql when excludeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:sparql [
                sh:message "Age must be non-negative" ;
                sh:select """
                    SELECT $this
                    WHERE {
                        $this ex:age ?age .
                        FILTER (?age < 0)
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
      const personDef = schema.$defs?.Person as Record<string, unknown>;
      expect(personDef['x-shacl-sparql']).toBeUndefined();
    });
  });

  describe('x-shacl-ignoredProperties', () => {
    it('should exclude x-shacl-ignoredProperties when excludeShaclExtensions is true', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ClosedShape
            a sh:NodeShape ;
            sh:targetClass ex:Closed ;
            sh:closed true ;
            sh:ignoredProperties ( ex:internal ) ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();
      expect(schema['x-shacl-prefixes']).toBeUndefined();
      const closedDef = schema.$defs?.Closed as Record<string, unknown>;
      expect(closedDef['x-shacl-ignoredProperties']).toBeUndefined();
    });
  });

  describe('preserves standard JSON Schema properties', () => {
    it('should preserve all standard JSON Schema properties when excluding extensions', async () => {
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
                sh:minLength 1 ;
                sh:maxLength 100 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
                sh:minInclusive 0 ;
                sh:maxInclusive 150 ;
            ] ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$" ;
                sh:equals ex:confirmEmail ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { excludeShaclExtensions: true }).convert();

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$defs).toBeDefined();
      expect(schema.$ref).toBe('#/$defs/Person');
      expect(schema['x-shacl-prefixes']).toBeUndefined();

      const personDef = schema.$defs?.Person as {
        properties?: {
          name?: Record<string, unknown>;
          age?: Record<string, unknown>;
          email?: Record<string, unknown>;
        };
        required?: string[];
      };

      expect(personDef.properties?.name?.type).toBe('string');
      expect(personDef.properties?.name?.minLength).toBe(1);
      expect(personDef.properties?.name?.maxLength).toBe(100);

      expect(personDef.properties?.age?.type).toBe('integer');
      expect(personDef.properties?.age?.minimum).toBe(0);
      expect(personDef.properties?.age?.maximum).toBe(150);

      expect(personDef.properties?.email?.type).toBe('string');
      expect(personDef.properties?.email?.pattern).toBeDefined();
      expect(personDef.properties?.email?.['x-shacl-equals']).toBeUndefined();

      expect(personDef.required).toContain('name');
    });
  });
});
