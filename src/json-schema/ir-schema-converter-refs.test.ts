import { IrSchemaConverter } from './ir-schema-converter';
import {
  IntermediateRepresentation,
  IntermediateRepresentationBuilder,
} from '../ir/intermediate-representation-builder';
import { ShaclParser } from '../shacl/parser/shacl-parser';

async function getIr(content: string): Promise<IntermediateRepresentation> {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  return new IntermediateRepresentationBuilder(shaclDocument).build();
}

describe('IR Schema Converter - $refs', () => {
  describe('qualifiedValueShape with blank nodes', () => {
    it('should inline blank node schema with sh:class constraint', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:TeamShape
            a              sh:NodeShape ;
            sh:targetClass ex:Team ;
            sh:property    [ sh:path                ex:member ;
                             sh:qualifiedValueShape [ sh:class ex:Person ] ;
                             sh:qualifiedMinCount   1 ;
                             sh:qualifiedMaxCount   5 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Team: {
            properties: {
              member: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Person',
                },
                minItems: 1,
                maxItems: 5,
              },
            },
          },
        },
      });
    });

    it('should inline blank node schema with sh:class and nested property constraints (single value)', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:TeamShape
            a              sh:NodeShape ;
            sh:targetClass ex:Team ;
            sh:property    [ sh:path                ex:leader ;
                             sh:qualifiedValueShape [ sh:class    ex:Person ;
                                                      sh:property [ sh:path     ex:role ;
                                                                    sh:hasValue "Leader" ] ] ;
                             sh:qualifiedMinCount   1 ;
                             sh:qualifiedMaxCount   1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Team: {
            properties: {
              leader: {
                $ref: '#/$defs/Person',
                properties: {
                  role: {
                    const: 'Leader',
                  },
                },
              },
            },
            required: ['leader'],
          },
        },
      });
    });

    it('should inline blank node schema with multiple nested property constraints', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProjectShape
            a              sh:NodeShape ;
            sh:targetClass ex:Project ;
            sh:property    [ sh:path                ex:manager ;
                             sh:qualifiedValueShape [ sh:class    ex:Employee ;
                                                      sh:property [ sh:path     ex:level ;
                                                                    sh:hasValue "Senior" ] ;
                                                      sh:property [ sh:path     ex:department ;
                                                                    sh:minCount 1 ] ] ;
                             sh:qualifiedMinCount   1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Project: {
            properties: {
              manager: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Employee',
                  properties: {
                    level: {
                      const: 'Senior',
                    },
                    department: {},
                  },
                },
                minItems: 1,
              },
            },
            required: ['manager'],
          },
        },
      });
    });
  });

  describe('sh:class references', () => {
    it('should generate $ref for sh:class in array context', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:CompanyShape
            a              sh:NodeShape ;
            sh:targetClass ex:Company ;
            sh:property    [ sh:path     ex:employees ;
                             sh:class    ex:Employee ;
                             sh:minCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Company: {
            properties: {
              employees: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Employee',
                },
                minItems: 1,
              },
            },
            required: ['employees'],
          },
        },
      });
    });

    it('should generate $ref for sh:class in non-array context', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:OrderShape
            a              sh:NodeShape ;
            sh:targetClass ex:Order ;
            sh:property    [ sh:path     ex:customer ;
                             sh:class    ex:Customer ;
                             sh:minCount 1 ;
                             sh:maxCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Order: {
            properties: {
              customer: {
                $ref: '#/$defs/Customer',
              },
            },
            required: ['customer'],
          },
        },
      });
    });
  });

  describe('sh:node references', () => {
    it('should generate $ref for sh:node to named shape', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:AddressShape
            a              sh:NodeShape ;
            sh:targetClass ex:Address ;
            sh:property    [ sh:path     ex:street ;
                             sh:datatype xsd:string ] .

        ex:PersonShape
            a              sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property    [ sh:path     ex:address ;
                             sh:node     ex:AddressShape ;
                             sh:minCount 1 ;
                             sh:maxCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Person: {
            properties: {
              address: {
                $ref: '#/$defs/Address',
              },
            },
            required: ['address'],
          },
        },
      });
    });

    it('should generate $ref for sh:node in array context', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:ItemShape
            a              sh:NodeShape ;
            sh:targetClass ex:Item .

        ex:CartShape
            a              sh:NodeShape ;
            sh:targetClass ex:Cart ;
            sh:property    [ sh:path     ex:items ;
                             sh:node     ex:ItemShape ;
                             sh:minCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: $ref uses the targetClass name (Item), not the shape name (ItemShape)
      expect(schema).toMatchObject({
        $defs: {
          Cart: {
            properties: {
              items: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Item',
                },
                minItems: 1,
              },
            },
            required: ['items'],
          },
        },
      });
    });
  });

  describe('logical constraints with $refs', () => {
    it('should use $ref for named shapes in sh:or', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:CatShape a sh:NodeShape ; sh:targetClass ex:Cat .
        ex:DogShape a sh:NodeShape ; sh:targetClass ex:Dog .

        ex:PetOwnerShape
            a              sh:NodeShape ;
            sh:targetClass ex:PetOwner ;
            sh:property    [ sh:path ex:pet ;
                             sh:or   ( ex:CatShape ex:DogShape ) ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: $ref uses the targetClass names (Cat, Dog), not the shape names
      expect(schema).toMatchObject({
        $defs: {
          PetOwner: {
            properties: {
              pet: {
                anyOf: [{ $ref: '#/$defs/Cat' }, { $ref: '#/$defs/Dog' }],
              },
            },
          },
        },
      });
    });

    it('should inline blank node schemas in sh:or', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContactShape
            a              sh:NodeShape ;
            sh:targetClass ex:Contact ;
            sh:property    [ sh:path ex:identifier ;
                             sh:or   ( [ sh:datatype xsd:string ; sh:pattern "^[a-z]+$" ]
                                       [ sh:datatype xsd:integer ] ) ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Contact: {
            properties: {
              identifier: {
                anyOf: [{ type: 'string', pattern: '^[a-z]+$' }, { type: 'integer' }],
              },
            },
          },
        },
      });
    });

    it('should use $ref for named shapes in sh:and', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:NamedShape a sh:NodeShape ; sh:targetClass ex:Named .
        ex:AgedShape  a sh:NodeShape ; sh:targetClass ex:Aged .

        ex:PersonShape
            a              sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:and         ( ex:NamedShape ex:AgedShape ) .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: $ref uses the targetClass names (Named, Aged), not the shape names
      expect(schema).toMatchObject({
        $defs: {
          Person: {
            allOf: [{ $ref: '#/$defs/Named' }, { $ref: '#/$defs/Aged' }],
          },
        },
      });
    });

    it('should inline blank node schemas in sh:and', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a              sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:and         ( [ sh:property [ sh:path ex:name ; sh:minCount 1 ] ]
                             [ sh:property [ sh:path ex:price ; sh:datatype xsd:decimal ] ] ) .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          Product: {
            allOf: [
              { properties: { name: {} }, required: ['name'] },
              { properties: { price: { type: 'number' } } },
            ],
          },
        },
      });
    });

    it('should use $ref for named shapes in sh:xone', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:CreditCardShape  a sh:NodeShape ; sh:targetClass ex:CreditCard .
        ex:BankTransferShape a sh:NodeShape ; sh:targetClass ex:BankTransfer .

        ex:PaymentShape
            a              sh:NodeShape ;
            sh:targetClass ex:Payment ;
            sh:xone        ( ex:CreditCardShape ex:BankTransferShape ) .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: $ref uses the targetClass names
      expect(schema).toMatchObject({
        $defs: {
          Payment: {
            oneOf: [{ $ref: '#/$defs/CreditCard' }, { $ref: '#/$defs/BankTransfer' }],
          },
        },
      });
    });

    it('should use $ref for named shape in sh:not', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .

        ex:RestrictedShape a sh:NodeShape ; sh:targetClass ex:Restricted .

        ex:OpenShape
            a              sh:NodeShape ;
            sh:targetClass ex:Open ;
            sh:not         ex:RestrictedShape .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: $ref uses the targetClass name
      expect(schema).toMatchObject({
        $defs: {
          Open: {
            not: { $ref: '#/$defs/Restricted' },
          },
        },
      });
    });

    it('should inline blank node schema in sh:not with numeric value', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:NonZeroShape
            a              sh:NodeShape ;
            sh:targetClass ex:NonZero ;
            sh:property    [ sh:path ex:value ;
                             sh:not  [ sh:hasValue 0 ] ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      expect(schema).toMatchObject({
        $defs: {
          NonZero: {
            properties: {
              value: {
                not: { const: 0 },
              },
            },
          },
        },
      });
    });
  });

  describe('deeply nested blank nodes', () => {
    it('should handle multiple levels of nested blank nodes', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrganizationShape
            a              sh:NodeShape ;
            sh:targetClass ex:Organization ;
            sh:property    [ sh:path                ex:department ;
                             sh:qualifiedValueShape [ sh:class    ex:Department ;
                                                      sh:property [ sh:path                ex:head ;
                                                                    sh:qualifiedValueShape [ sh:class    ex:Employee ;
                                                                                             sh:property [ sh:path     ex:title ;
                                                                                                           sh:hasValue "Director" ] ] ;
                                                                    sh:qualifiedMinCount   1 ;
                                                                    sh:qualifiedMaxCount   1 ] ] ;
                             sh:qualifiedMinCount   1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: With maxCount=1, the nested head is a single value, not an array
      expect(schema).toMatchObject({
        $defs: {
          Organization: {
            properties: {
              department: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Department',
                  properties: {
                    head: {
                      $ref: '#/$defs/Employee',
                      properties: {
                        title: {
                          const: 'Director',
                        },
                      },
                    },
                  },
                },
                minItems: 1,
              },
            },
            required: ['department'],
          },
        },
      });
    });

    it('should handle deeply nested arrays with logical constraints', async () => {
      // This creates paths like: $defs/University/properties/faculties/items/properties/courses/items/...
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UniversityShape
            a              sh:NodeShape ;
            sh:targetClass ex:University ;
            sh:property    [ sh:path     ex:faculties ;
                             sh:minCount 1 ;
                             sh:qualifiedValueShape [
                                 sh:class    ex:Faculty ;
                                 sh:property [ sh:path     ex:courses ;
                                               sh:minCount 1 ;
                                               sh:qualifiedValueShape [
                                                   sh:class    ex:Course ;
                                                   sh:property [ sh:path     ex:students ;
                                                                 sh:minCount 1 ;
                                                                 sh:qualifiedValueShape [
                                                                     sh:class    ex:Student ;
                                                                     sh:property [ sh:path     ex:grades ;
                                                                                   sh:minCount 1 ;
                                                                                   sh:or ( [ sh:datatype xsd:integer ;
                                                                                             sh:minInclusive 0 ;
                                                                                             sh:maxInclusive 100 ]
                                                                                           [ sh:datatype xsd:string ;
                                                                                             sh:pattern "^[A-F][+-]?$" ] ) ] ] ;
                                                                 sh:qualifiedMinCount 1 ] ] ;
                                                   sh:qualifiedMinCount 1 ] ] ;
                             sh:qualifiedMinCount 1 ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Deep nesting: University -> faculties[] -> courses[] -> students[] -> grades with anyOf
      expect(schema).toMatchObject({
        $defs: {
          University: {
            properties: {
              faculties: {
                type: 'array',
                minItems: 1,
                items: {
                  $ref: '#/$defs/Faculty',
                  properties: {
                    courses: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        $ref: '#/$defs/Course',
                        properties: {
                          students: {
                            type: 'array',
                            minItems: 1,
                            items: {
                              $ref: '#/$defs/Student',
                              properties: {
                                grades: {
                                  type: 'array',
                                  minItems: 1,
                                  anyOf: [
                                    { type: 'integer', minimum: 0, maximum: 100 },
                                    { type: 'string', pattern: '^[A-F][+-]?$' },
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            required: ['faculties'],
          },
        },
      });
    });
  });

  describe('mixed named and blank node references', () => {
    it('should handle sh:or with mixed named shapes and blank nodes', async () => {
      const shacl = `
        @prefix ex:  <http://example.org/> .
        @prefix sh:  <http://www.w3.org/ns/shacl#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EmailShape a sh:NodeShape ; sh:targetClass ex:Email .

        ex:ContactInfoShape
            a              sh:NodeShape ;
            sh:targetClass ex:ContactInfo ;
            sh:property    [ sh:path ex:contact ;
                             sh:or   ( ex:EmailShape
                                       [ sh:datatype xsd:string ; sh:pattern "^\\\\+[0-9]+$" ] ) ] .
      `;

      const ir = await getIr(shacl);
      const schema = new IrSchemaConverter(ir).convert();

      // Note: $ref uses the targetClass name (Email), not the shape name
      expect(schema).toMatchObject({
        $defs: {
          ContactInfo: {
            properties: {
              contact: {
                anyOf: [{ $ref: '#/$defs/Email' }, { type: 'string', pattern: '^\\+[0-9]+$' }],
              },
            },
          },
        },
      });
    });
  });
});
