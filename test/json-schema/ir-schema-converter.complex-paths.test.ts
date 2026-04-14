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

const JSON_SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';

describe('IR Schema Converter - Complex Paths', () => {
  describe('zeroOrMorePath', () => {
    it('should use the inner IRI local name as the property key for an inline zeroOrMorePath', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path [sh:zeroOrMorePath ex:knows] ;
                sh:minCount 1 ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Person',
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            additionalProperties: true,
            properties: {
              knows: {
                type: 'array',
                minItems: 1,
              },
            },
            required: ['knows'],
          },
        },
      });
    });

    it('should use the inner IRI local name for a named property shape with zeroOrMorePath', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:DocumentShape
            a sh:NodeShape ;
            sh:targetClass ex:Document ;
            sh:property ex:DocumentShape-chain .

        ex:DocumentShape-chain
            a sh:PropertyShape ;
            sh:path [sh:zeroOrMorePath ex:parent] ;
            sh:datatype xsd:string .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Document',
        $defs: {
          Document: {
            title: 'Document',
            type: 'object',
            additionalProperties: true,
            properties: {
              parent: {
                type: 'string',
              },
            },
          },
        },
      });
    });
  });

  describe('oneOrMorePath', () => {
    it('should use the inner IRI local name as the property key for oneOrMorePath', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ArticleShape
            a sh:NodeShape ;
            sh:targetClass ex:Article ;
            sh:property [
                sh:path [sh:oneOrMorePath ex:author] ;
                sh:datatype xsd:string ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Article',
        $defs: {
          Article: {
            title: 'Article',
            type: 'object',
            additionalProperties: true,
            properties: {
              author: {
                type: 'string',
              },
            },
          },
        },
      });
    });
  });

  describe('zeroOrOnePath', () => {
    it('should use the inner IRI local name as the property key for zeroOrOnePath', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .

        ex:RecordShape
            a sh:NodeShape ;
            sh:targetClass ex:Record ;
            sh:property [
                sh:path [sh:zeroOrOnePath ex:approvedBy] ;
                sh:nodeKind sh:IRI ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Record',
        $defs: {
          Record: {
            title: 'Record',
            type: 'object',
            additionalProperties: true,
            properties: {
              approvedBy: {
                type: 'string',
                format: 'uri',
              },
            },
          },
        },
      });
    });
  });

  describe('inversePath', () => {
    it('should use the inner IRI local name as the property key for inversePath', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .

        ex:InstructorShape
            a sh:NodeShape ;
            sh:targetClass ex:Instructor ;
            sh:property [
                sh:path [sh:inversePath ex:taughtBy] ;
                sh:minCount 1 ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Instructor',
        $defs: {
          Instructor: {
            title: 'Instructor',
            type: 'object',
            additionalProperties: true,
            properties: {
              taughtBy: {
                type: 'array',
                minItems: 1,
              },
            },
            required: ['taughtBy'],
          },
        },
      });
    });
  });

  describe('alternativePath', () => {
    it('should use the first alternative IRI local name as the property key', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContactShape
            a sh:NodeShape ;
            sh:targetClass ex:Contact ;
            sh:property [
                sh:path [sh:alternativePath (ex:phone ex:mobile)] ;
                sh:datatype xsd:string ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Contact',
        $defs: {
          Contact: {
            title: 'Contact',
            type: 'object',
            additionalProperties: true,
            properties: {
              phone: {
                type: 'string',
              },
            },
          },
        },
      });
    });
  });

  describe('sequence path', () => {
    it('should use the last IRI local name as the property key for a sequence path', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path (ex:address ex:city) ;
                sh:datatype xsd:string ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content), {
        excludeShaclExtensions: true,
      }).convert();
      expect(schema).toStrictEqual({
        $schema: JSON_SCHEMA_DRAFT,
        $ref: '#/$defs/Person',
        $defs: {
          Person: {
            title: 'Person',
            type: 'object',
            additionalProperties: true,
            properties: {
              city: {
                type: 'string',
              },
            },
          },
        },
      });
    });
  });

  describe('x-shacl extension preservation', () => {
    it('should include x-shacl path extension inside the property schema', async () => {
      const content = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path [sh:zeroOrMorePath ex:knows] ;
                sh:minCount 1 ;
            ] .
      `;
      const schema = new IrSchemaConverter(await getIr(content)).convert();
      const personDef = schema.$defs?.Person as Record<string, unknown>;
      const knowsProp = (personDef.properties as Record<string, unknown>).knows;
      expect(knowsProp).toBeDefined();
      expect((knowsProp as Record<string, unknown>)['x-shacl-zeroOrMorePath']).toBeDefined();
    });
  });
});
