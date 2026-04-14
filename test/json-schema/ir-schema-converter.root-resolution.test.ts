import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../../src/ir/intermediate-representation-builder';
import { ShaclParser } from '../../src/shacl/parser/shacl-parser';
import { IrSchemaConverter } from '../../src/json-schema/ir-schema-converter';
import { ConversionOptions } from '../../src';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

function convert(ir: IntermediateRepresentation, options?: ConversionOptions) {
  return new IrSchemaConverter(ir, options).convert();
}

describe('IR Schema Converter - Root Resolution', () => {
  describe('auto-detection', () => {
    it('should set $ref to the single unreferenced shape', async () => {
      // Person references Address; Address is a leaf → Person is the root
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:AddressShape
            a sh:NodeShape ;
            sh:targetClass ex:Address ;
            sh:property [ sh:path ex:street ; sh:datatype xsd:string ] .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:address ; sh:class ex:Address ; sh:maxCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = convert(ir, undefined);

      expect(schema).toMatchObject({ $ref: '#/$defs/Person' });
      expect(schema).toHaveProperty('$defs.Person');
      expect(schema).toHaveProperty('$defs.Address');
    });

    it('should use anyOf when multiple unreferenced shapes exist', async () => {
      // Dog and Cat are standalone; neither references the other
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DogShape
            a sh:NodeShape ;
            sh:targetClass ex:Dog ;
            sh:property [ sh:path ex:breed ; sh:datatype xsd:string ] .

        ex:CatShape
            a sh:NodeShape ;
            sh:targetClass ex:Cat ;
            sh:property [ sh:path ex:indoor ; sh:datatype xsd:boolean ] .
      `;

      const ir = await getIr(shacl);
      const schema = convert(ir, undefined);

      expect(schema).not.toHaveProperty('$ref');
      expect(schema.anyOf).toEqual(
        expect.arrayContaining([{ $ref: '#/$defs/Dog' }, { $ref: '#/$defs/Cat' }])
      );
      expect(schema.anyOf).toHaveLength(2);
    });

    it('should add no root reference when all shapes form a cycle', async () => {
      // A references B, B references A → both are referenced → no root
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .

        ex:AShape
            a sh:NodeShape ;
            sh:targetClass ex:A ;
            sh:property [ sh:path ex:b ; sh:class ex:B ; sh:maxCount 1 ] .

        ex:BShape
            a sh:NodeShape ;
            sh:targetClass ex:B ;
            sh:property [ sh:path ex:a ; sh:class ex:A ; sh:maxCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = convert(ir, undefined);

      expect(schema).not.toHaveProperty('$ref');
      expect(schema).not.toHaveProperty('anyOf');
      expect(schema).toHaveProperty('$defs.A');
      expect(schema).toHaveProperty('$defs.B');
    });

    it('should detect the root correctly for a three-level hierarchy', async () => {
      // Order → LineItem → Product; only Order is unreferenced
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [ sh:path ex:name ; sh:datatype xsd:string ] .

        ex:LineItemShape
            a sh:NodeShape ;
            sh:targetClass ex:LineItem ;
            sh:property [ sh:path ex:product ; sh:class ex:Product ; sh:maxCount 1 ] .

        ex:OrderShape
            a sh:NodeShape ;
            sh:targetClass ex:Order ;
            sh:property [ sh:path ex:items ; sh:class ex:LineItem ; sh:minCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = convert(ir, undefined);

      expect(schema).toMatchObject({ $ref: '#/$defs/Order' });
      expect(schema).not.toHaveProperty('anyOf');
    });
  });

  describe('explicit --root option', () => {
    it('should use the specified shape as root by local name', async () => {
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:AddressShape
            a sh:NodeShape ;
            sh:targetClass ex:Address ;
            sh:property [ sh:path ex:street ; sh:datatype xsd:string ] .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:address ; sh:class ex:Address ; sh:maxCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = convert(ir, { rootShape: 'Address' });

      expect(schema).toMatchObject({ $ref: '#/$defs/Address' });
    });

    it('should strip Shape suffix from a full URI root shape', async () => {
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [ sh:path ex:name ; sh:datatype xsd:string ] .
      `;

      const ir = await getIr(shacl);
      const schema = convert(ir, { rootShape: 'http://example.org/PersonShape' });

      expect(schema).toMatchObject({ $ref: '#/$defs/Person' });
    });

    it('should throw a descriptive error when the specified root shape does not exist', async () => {
      const shacl = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person .
      `;

      const ir = await getIr(shacl);

      expect(() => convert(ir, { rootShape: 'NonExistent' })).toThrow(
        /Root shape "NonExistent" not found/
      );
      expect(() => convert(ir, { rootShape: 'NonExistent' })).toThrow(/Person/);
    });
  });
});
