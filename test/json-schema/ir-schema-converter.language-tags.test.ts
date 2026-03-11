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

describe('IR Schema Converter - Language Tags', () => {
  describe('SHACL Properties with Language Tags', () => {
    it('should preserve all language tags for sh:name', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:name "Person"@en ;
            sh:name "Personne"@fr ;
            sh:name "Person"@de ;
            sh:property [
                sh:path ex:fullName ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
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
              fullName: {
                type: 'string',
              },
            },
            required: ['fullName'],
            title: 'Person',
            type: 'object',
            'x-shacl-name': [
              {
                language: 'de',
                type: 'langString',
                value: 'Person',
              },
              {
                language: 'fr',
                type: 'langString',
                value: 'Personne',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'Person',
              },
            ],
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

    it('should preserve all language tags for sh:description', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:description "A human being"@en ;
            sh:description "Un être humain"@fr ;
            sh:description "Ein Mensch"@de ;
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
            'x-shacl-description': [
              {
                language: 'de',
                type: 'langString',
                value: 'Ein Mensch',
              },
              {
                language: 'fr',
                type: 'langString',
                value: 'Un être humain',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'A human being',
              },
            ],
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

    it('should preserve all language tags for sh:message', async () => {
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
                sh:minCount 1 ;
                sh:maxCount 1 ;
                sh:message "Email is required"@en ;
                sh:message "L'email est requis"@fr ;
                sh:message "E-Mail ist erforderlich"@de ;
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
                type: 'string',
                'x-shacl-message': [
                  {
                    language: 'en',
                    type: 'langString',
                    value: 'Email is required',
                  },
                  {
                    language: 'fr',
                    type: 'langString',
                    value: "L'email est requis",
                  },
                  {
                    language: 'de',
                    type: 'langString',
                    value: 'E-Mail ist erforderlich',
                  },
                ],
              },
            },
            required: ['email'],
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

    it('should handle property shapes with multiple language-tagged names and descriptions', async () => {
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
                sh:name "Full Name"@en ;
                sh:name "Nom complet"@fr ;
                sh:name "Vollständiger Name"@de ;
                sh:description "The person's full legal name"@en ;
                sh:description "Le nom légal complet de la personne"@fr ;
                sh:description "Der vollständige rechtliche Name der Person"@de ;
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
                'x-shacl-description': [
                  {
                    language: 'de',
                    type: 'langString',
                    value: 'Der vollständige rechtliche Name der Person',
                  },
                  {
                    language: 'fr',
                    type: 'langString',
                    value: 'Le nom légal complet de la personne',
                  },
                  {
                    language: 'en',
                    type: 'langString',
                    value: "The person's full legal name",
                  },
                ],
                'x-shacl-name': [
                  {
                    language: 'de',
                    type: 'langString',
                    value: 'Vollständiger Name',
                  },
                  {
                    language: 'fr',
                    type: 'langString',
                    value: 'Nom complet',
                  },
                  {
                    language: 'en',
                    type: 'langString',
                    value: 'Full Name',
                  },
                ],
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
  });

  describe('Additional Properties with Language Tags', () => {
    it('should preserve all language tags for Dublin Core dcterms:title', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            dcterms:title "Organization"@en ;
            dcterms:title "Organisation"@fr ;
            dcterms:title "Organisation"@de ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Organization: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'Organization',
            type: 'object',
            'x-shacl-title': [
              {
                language: 'de',
                type: 'langString',
                value: 'Organisation',
              },
              {
                language: 'fr',
                type: 'langString',
                value: 'Organisation',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'Organization',
              },
            ],
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          dcterms: 'http://purl.org/dc/terms/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should preserve all language tags for Dublin Core dcterms:description', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrganizationShape
            a sh:NodeShape ;
            sh:targetClass ex:Organization ;
            dcterms:description "An organized group of people"@en ;
            dcterms:description "Un groupe organisé de personnes"@fr ;
            dcterms:description "Eine organisierte Gruppe von Menschen"@de ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Organization: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'Organization',
            type: 'object',
            'x-shacl-description': [
              {
                language: 'de',
                type: 'langString',
                value: 'Eine organisierte Gruppe von Menschen',
              },
              {
                language: 'fr',
                type: 'langString',
                value: 'Un groupe organisé de personnes',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'An organized group of people',
              },
            ],
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          dcterms: 'http://purl.org/dc/terms/',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle multiple additional properties with language tags', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            dcterms:title "Product"@en ;
            dcterms:title "Produit"@fr ;
            rdfs:label "Product Label"@en ;
            rdfs:label "Étiquette de produit"@fr ;
            rdfs:comment "Product information"@en ;
            rdfs:comment "Informations sur le produit"@fr ;
            sh:property [
                sh:path ex:productName ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Product: {
            additionalProperties: true,
            properties: {
              productName: {
                type: 'string',
              },
            },
            title: 'Product',
            type: 'object',
            'x-shacl-comment': [
              {
                language: 'fr',
                type: 'langString',
                value: 'Informations sur le produit',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'Product information',
              },
            ],
            'x-shacl-label': [
              {
                language: 'fr',
                type: 'langString',
                value: 'Étiquette de produit',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'Product Label',
              },
            ],
            'x-shacl-title': [
              {
                language: 'fr',
                type: 'langString',
                value: 'Produit',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'Product',
              },
            ],
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          sh: 'http://www.w3.org/ns/shacl#',
          ex: 'http://example.org/',
          dcterms: 'http://purl.org/dc/terms/',
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Mixed Language Tags and Plain Literals', () => {
    it('should handle properties with both language-tagged and plain literal values', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:name "Product"@en ;
            sh:name "Produit"@fr ;
            sh:description "A product for sale" ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Product: {
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
            },
            title: 'Product',
            type: 'object',
            'x-shacl-description': {
              datatype: 'string',
              type: 'literal',
              value: 'A product for sale',
            },
            'x-shacl-name': [
              {
                language: 'fr',
                type: 'langString',
                value: 'Produit',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'Product',
              },
            ],
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

    it('should handle shapes with no language tags (baseline test)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SimpleShape
            a sh:NodeShape ;
            sh:targetClass ex:Simple ;
            sh:name "Simple Shape" ;
            sh:description "A simple shape without language tags" ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Simple: {
            additionalProperties: true,
            properties: {
              value: {
                type: 'string',
              },
            },
            title: 'Simple',
            type: 'object',
            'x-shacl-description': {
              datatype: 'string',
              type: 'literal',
              value: 'A simple shape without language tags',
            },
            'x-shacl-name': {
              datatype: 'string',
              type: 'literal',
              value: 'Simple ',
            },
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

    it('should handle single language-tagged value (not as array)', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SimpleShape
            a sh:NodeShape ;
            sh:targetClass ex:Simple ;
            sh:name "Simple Shape"@en ;
            sh:property [
                sh:path ex:value ;
                sh:datatype xsd:string ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Simple: {
            additionalProperties: true,
            properties: {
              value: {
                type: 'string',
              },
            },
            title: 'Simple',
            type: 'object',
            'x-shacl-name': {
              language: 'en',
              type: 'langString',
              value: 'Simple ',
            },
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

  describe('Real-world Examples', () => {
    it('should handle system-nfdi4ing.ttl-like structure with language tags', async () => {
      const content = `
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:SystemShape
            dcterms:created "2024-01-15"^^xsd:date ;
            dcterms:creator <https://orcid.org/0000-0002-1234-5678> ;
            dcterms:description "A System is a unit of abstraction"@en ;
            dcterms:description "Ein System ist eine Abstraktionseinheit"@de ;
            dcterms:title "system"@en ;
            dcterms:title "System"@de ;
            a sh:NodeShape ;
            sh:targetClass ex:System ;
            sh:property [
                sh:path ex:hasSubSystem ;
                sh:description "Relation between a System and its component parts"@en ;
                sh:description "Beziehung zwischen einem System und seinen Komponenten"@de ;
                sh:name "hasSubSystem"@en ;
                sh:name "hatUntersystem"@de ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toStrictEqual({
        $defs: {
          System: {
            additionalProperties: true,
            properties: {
              hasSubSystem: {
                type: 'array',
                'x-shacl-description': [
                  {
                    language: 'de',
                    type: 'langString',
                    value: 'Beziehung zwischen einem System und seinen Komponenten',
                  },
                  {
                    language: 'en',
                    type: 'langString',
                    value: 'Relation between a System and its component parts',
                  },
                ],
                'x-shacl-name': [
                  {
                    language: 'de',
                    type: 'langString',
                    value: 'hatUntersystem',
                  },
                  {
                    language: 'en',
                    type: 'langString',
                    value: 'hasSubSystem',
                  },
                ],
              },
            },
            title: 'System',
            type: 'object',
            'x-shacl-created': {
              datatype: 'date',
              type: 'literal',
              value: '2024-01-15',
            },
            'x-shacl-description': [
              {
                language: 'de',
                type: 'langString',
                value: 'Ein System ist eine Abstraktionseinheit',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'A System is a unit of abstraction',
              },
            ],
            'x-shacl-title': [
              {
                language: 'de',
                type: 'langString',
                value: 'System',
              },
              {
                language: 'en',
                type: 'langString',
                value: 'system',
              },
            ],
          },
        },
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          dcterms: 'http://purl.org/dc/terms/',
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });
});
