import { describe, expect, it } from '@jest/globals';
import { IntermediateRepresentationBuilder } from '../../src/ir/intermediate-representation-builder';
import { ShaclParser } from '../../src/shacl/parser/shacl-parser';
import { IrSchemaConverter } from '../../src/json-schema/ir-schema-converter';

describe('IrSchemaConverter - Same Path Properties', () => {
  describe('Multiple properties with same path in single shape', () => {
    it('should merge constraints when same path appears multiple times', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:maxLength 50 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:pattern "^[A-Z]" ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      // Expected: Both constraints should be merged for ex:name property using allOf
      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              name: {
                allOf: [
                  {
                    type: 'string',
                    minLength: 1,
                    maxLength: 50,
                  },
                  {
                    type: 'string',
                    pattern: '^[A-Z]',
                  },
                ],
              },
            },
            required: ['name'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });

    it('should merge cardinality constraints for same path', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[^@]+@[^@]+\\\\.[^@]+$" ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              email: {
                allOf: [
                  {
                    type: 'string',
                  },
                  {
                    type: 'string',
                    pattern: '^[^@]+@[^@]+\\.[^@]+$',
                  },
                ],
              },
            },
            required: ['email'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });

    it('should merge different constraint types for same path', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
                sh:maxInclusive 10000 ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Product: {
            additionalProperties: true,
            type: 'object',
            properties: {
              price: {
                allOf: [
                  {
                    type: 'number',
                    minimum: 0,
                  },
                  {
                    type: 'number',
                    maximum: 10000,
                  },
                ],
              },
            },
            required: ['price'],
            title: 'Product',
          },
        },
        $ref: '#/$defs/Product',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });
  });

  describe('Multiple shapes with same target and same path', () => {
    it('should merge properties when different shapes target same class with same path', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape1
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .

        ex:PersonShape2
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:maxLength 100 ;
                sh:pattern "^[A-Za-z]" ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              name: {
                allOf: [
                  {
                    type: 'string',
                    minLength: 1,
                  },
                  {
                    type: 'string',
                    maxLength: 100,
                    pattern: '^[A-Za-z]',
                  },
                ],
              },
            },
            required: ['name'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });

    it('should merge required fields when same path in different shapes', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
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
                sh:pattern "^[^@]+@[^@]+\\\\.[^@]+$" ;
            ] ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              email: {
                allOf: [
                  {
                    type: 'string',
                  },
                  {
                    type: 'string',
                    pattern: '^[^@]+@[^@]+\\.[^@]+$',
                  },
                ],
              },
              age: {
                type: 'integer',
              },
            },
            required: ['email'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });
  });

  describe('Complex merging scenarios', () => {
    it('should merge properties with class references and datatypes', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:address ;
                sh:class ex:Address ;
                sh:minCount 1 ;
                sh:maxCount 3 ;
            ] ;
            sh:property [
                sh:path ex:address ;
                sh:class ex:Address ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              address: {
                allOf: [
                  {
                    type: 'array',
                    items: {
                      $ref: '#/$defs/Address',
                    },
                    minItems: 1,
                    maxItems: 3,
                  },
                  {
                    type: 'array',
                    items: {
                      $ref: '#/$defs/Address',
                    },
                  },
                ],
              },
            },
            required: ['address'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });

    it('should handle logical operators on same path', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:identifier ;
                sh:or (
                    [ sh:datatype xsd:string ; sh:pattern "^ID-" ]
                    [ sh:datatype xsd:integer ; sh:minInclusive 1000 ]
                ) ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:identifier ;
                sh:maxLength 50 ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              identifier: {
                allOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^ID-',
                      },
                      {
                        type: 'integer',
                        minimum: 1000,
                      },
                    ],
                  },
                  {
                    maxLength: 50,
                  },
                ],
              },
            },
            required: ['identifier'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });

    it('should merge enum constraints on same path', async () => {
      const shaclDoc = `
        @prefix ex: <http://example.org/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:status ;
                sh:in ("active" "inactive" "pending") ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:status ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
            ] .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            additionalProperties: true,
            type: 'object',
            properties: {
              status: {
                allOf: [
                  {
                    enum: ['active', 'inactive', 'pending'],
                  },
                  {
                    type: 'string',
                    minLength: 3,
                  },
                ],
              },
            },
            required: ['status'],
            title: 'Person',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });
  });

  describe('Real-world scenario: Multiple shapes with overlapping constraints', () => {
    it('should merge multiple shapes targeting same class with complex overlapping paths', async () => {
      const shaclDoc = `
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix ex:   <http://example.org/ns#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShapeBasic
            a sh:NodeShape ;
            sh:targetClass ex:Person ;

            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;

            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
                sh:minInclusive 0 ;
            ] ;
        .

        ex:PersonShapeAdvanced
            a sh:NodeShape ;
            sh:targetClass ex:Person ;

            sh:property [
                sh:path ex:email ;
                sh:pattern "^[^@]+@[^@]+\\\\.[^@]+$" ;
                sh:message "Email must be a valid email address." ;
            ] ;

            sh:property [
                sh:path ex:age ;
                sh:maxInclusive 130 ;
            ] ;
        .

        ex:PersonShapePolicy
            a sh:NodeShape ;
            sh:targetClass ex:Person ;

            sh:property [
                sh:path ex:email ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;

            sh:property [
                sh:path ex:email ;
                sh:maxCount 2 ;
            ] ;

            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
            ] ;
        .

        ex:PersonShapeConditional
            a sh:NodeShape ;
            sh:targetClass ex:Person ;

            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
            ] ;

            sh:property [
                sh:path ex:age ;
                sh:lessThan ex:retirementAge ;
                sh:message "Age must be less than retirement age." ;
            ] ;
        .
      `;

      const shaclDocument = await new ShaclParser().withContent(shaclDoc).parse();
      const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
      const jsonSchema = new IrSchemaConverter(ir).convert();

      expect(jsonSchema).toStrictEqual({
        $defs: {
          Person: {
            title: 'Person',
            properties: {
              email: {
                allOf: [
                  {
                    type: 'string',
                  },
                  {
                    pattern: '^[^@]+@[^@]+\\.[^@]+$',
                  },
                  {
                    type: 'array',
                    maxItems: 2,
                  },
                  {
                    type: 'string',
                  },
                ],
              },
              age: {
                allOf: [
                  {
                    type: 'integer',
                    minimum: 0,
                  },
                  {
                    type: 'array',
                    maximum: 130,
                  },
                  {
                    type: 'integer',
                  },
                  {
                    type: 'array',
                  },
                ],
              },
            },
            required: ['email'],
            additionalProperties: true,
            type: 'object',
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      });
    });
  });
});
