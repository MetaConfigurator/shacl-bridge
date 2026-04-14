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

describe('SPARQL Constraints in SHACL', () => {
  describe('Basic SPARQL Constraints', () => {
    it('should handle shape with both standard constraints and SPARQL SELECT query', async () => {
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
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Person must have a unique email" ;
                sh:select """
                    SELECT $this ?email
                    WHERE {
                        $this ex:email ?email .
                        FILTER EXISTS {
                            ?other ex:email ?email .
                            FILTER (?other != $this)
                        }
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      // Standard constraints should be converted, SPARQL preserved as extension
      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            type: 'object',
            title: 'Person',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              email: {
                type: 'string',
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
              },
            },
            required: ['name', 'email'],
            'x-shacl-sparql': [
              {
                message: 'Person must have a unique email',
                select: `
                    SELECT $this ?email
                    WHERE {
                        $this ex:email ?email .
                        FILTER EXISTS {
                            ?other ex:email ?email .
                            FILTER (?other != $this)
                        }
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL ASK query for age and birthdate consistency', async () => {
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
            ] ;
            sh:property [
                sh:path ex:age ;
                sh:datatype xsd:integer ;
                sh:minInclusive 0 ;
                sh:maxInclusive 150 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:birthDate ;
                sh:datatype xsd:date ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Age must be consistent with birthdate" ;
                sh:ask """
                    ASK {
                        $this ex:age ?age ;
                              ex:birthDate ?birthDate .
                        BIND(YEAR(NOW()) - YEAR(?birthDate) AS ?calculatedAge)
                        FILTER(?age != ?calculatedAge)
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            type: 'object',
            title: 'Person',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
              age: {
                type: 'integer',
                minimum: 0,
                maximum: 150,
              },
              birthDate: {
                type: 'string',
                format: 'date',
              },
            },
            required: ['name'],
            'x-shacl-sparql': [
              {
                message: 'Age must be consistent with birthdate',
                ask: `
                    ASK {
                        $this ex:age ?age ;
                              ex:birthDate ?birthDate .
                        BIND(YEAR(NOW()) - YEAR(?birthDate) AS ?calculatedAge)
                        FILTER(?age != ?calculatedAge)
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle multiple SPARQL constraints on same shape', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ProductShape
            a sh:NodeShape ;
            sh:targetClass ex:Product ;
            sh:property [
                sh:path ex:sku ;
                sh:datatype xsd:string ;
                sh:pattern "^[A-Z]{3}-[0-9]{6}$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:stock ;
                sh:datatype xsd:integer ;
                sh:minInclusive 0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "SKU must be unique in catalog" ;
                sh:select """
                    SELECT $this WHERE {
                        $this ex:sku ?sku .
                        ?other ex:sku ?sku .
                        FILTER ($this != ?other)
                    }
                """ ;
            ] ;
            sh:sparql [
                sh:message "Stock cannot be negative" ;
                sh:select """
                    SELECT $this WHERE {
                        $this ex:stock ?stock .
                        FILTER (?stock < 0)
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Product: {
            type: 'object',
            title: 'Product',
            additionalProperties: true,
            properties: {
              sku: {
                type: 'string',
                pattern: '^[A-Z]{3}-[0-9]{6}$',
              },
              price: {
                type: 'number',
                exclusiveMinimum: 0,
              },
              stock: {
                type: 'integer',
                minimum: 0,
              },
            },
            required: ['sku', 'price', 'stock'],
            'x-shacl-sparql': [
              {
                message: 'SKU must be unique in catalog',
                select: `
                    SELECT $this WHERE {
                        $this ex:sku ?sku .
                        ?other ex:sku ?sku .
                        FILTER ($this != ?other)
                    }
                `,
              },
              {
                message: 'Stock cannot be negative',
                select: `
                    SELECT $this WHERE {
                        $this ex:stock ?stock .
                        FILTER (?stock < 0)
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Product',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Property-level SPARQL Constraints', () => {
    it('should handle SPARQL constraint on property shape', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:UserShape
            a sh:NodeShape ;
            sh:targetClass ex:User ;
            sh:property [
                sh:path ex:username ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
                sh:maxLength 20 ;
                sh:pattern "^[a-zA-Z0-9_]+$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
                sh:sparql [
                    sh:message "Email must be unique in the system" ;
                    sh:select """
                        SELECT $this ?email
                        WHERE {
                            $this ex:email ?email .
                            ?other ex:email ?email .
                            FILTER ($this != ?other)
                        }
                    """ ;
                ] ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          User: {
            type: 'object',
            title: 'User',
            additionalProperties: true,
            properties: {
              username: {
                type: 'string',
                minLength: 3,
                maxLength: 20,
                pattern: '^[a-zA-Z0-9_]+$',
              },
              email: {
                type: 'string',
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
                'x-shacl-sparql': [
                  {
                    message: 'Email must be unique in the system',
                    select:
                      '\n                        SELECT $this ?email\n                        WHERE {\n                            $this ex:email ?email .\n                            ?other ex:email ?email .\n                            FILTER ($this != ?other)\n                        }\n                    ',
                  },
                ],
              },
            },
            required: ['username', 'email'],
          },
        },
        $ref: '#/$defs/User',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('Complex SPARQL Validation Rules', () => {
    it('should handle SPARQL constraint with aggregation for team size', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:TeamShape
            a sh:NodeShape ;
            sh:targetClass ex:Team ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:member ;
                sh:node ex:MemberShape ;
            ] ;
            sh:sparql [
                sh:message "Team must have at least 5 members" ;
                sh:select """
                    SELECT $this (COUNT(?member) AS ?count)
                    WHERE {
                        $this ex:member ?member .
                    }
                    GROUP BY $this
                    HAVING (COUNT(?member) < 5)
                """ ;
            ] .

        ex:MemberShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:memberId ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:memberName ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Member: {
            type: 'object',
            title: 'Member',
            additionalProperties: true,
            properties: {
              memberId: {
                type: 'string',
              },
              memberName: {
                type: 'string',
              },
            },
            required: ['memberId', 'memberName'],
          },
          Team: {
            type: 'object',
            title: 'Team',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
                minLength: 1,
              },
              member: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Member',
                },
              },
            },
            required: ['name'],
            'x-shacl-sparql': [
              {
                message: 'Team must have at least 5 members',
                select: `
                    SELECT $this (COUNT(?member) AS ?count)
                    WHERE {
                        $this ex:member ?member .
                    }
                    GROUP BY $this
                    HAVING (COUNT(?member) < 5)
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Team',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL constraint with OPTIONAL patterns for conditional validation', async () => {
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
            ] ;
            sh:property [
                sh:path ex:address ;
                sh:node ex:AddressShape ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "If address is provided, it must have a country" ;
                sh:select """
                    SELECT $this
                    WHERE {
                        $this ex:address ?address .
                        OPTIONAL { ?address ex:country ?country }
                        FILTER (!BOUND(?country))
                    }
                """ ;
            ] .

        ex:AddressShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:street ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
            ] ;
            sh:property [
                sh:path ex:city ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
            ] ;
            sh:property [
                sh:path ex:country ;
                sh:datatype xsd:string ;
                sh:minLength 2 ;
                sh:maxLength 2 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Address: {
            type: 'object',
            title: 'Address',
            additionalProperties: true,
            properties: {
              street: {
                type: 'string',
                minLength: 1,
              },
              city: {
                type: 'string',
                minLength: 1,
              },
              country: {
                type: 'string',
                minLength: 2,
                maxLength: 2,
              },
            },
            required: ['street', 'city', 'country'],
          },
          Person: {
            type: 'object',
            title: 'Person',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
              address: {
                $ref: '#/$defs/Address',
              },
            },
            required: ['name'],
            'x-shacl-sparql': [
              {
                message: 'If address is provided, it must have a country',
                select: `
                    SELECT $this
                    WHERE {
                        $this ex:address ?address .
                        OPTIONAL { ?address ex:country ?country }
                        FILTER (!BOUND(?country))
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Person',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL constraint validating order total matches line items', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:OrderShape
            a sh:NodeShape ;
            sh:targetClass ex:Order ;
            sh:property [
                sh:path ex:orderId ;
                sh:datatype xsd:string ;
                sh:pattern "^ORD-[0-9]{6}$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:total ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:lineItem ;
                sh:node ex:LineItemShape ;
                sh:minCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Order total must match sum of line items" ;
                sh:select """
                    SELECT $this ?total ?calculatedTotal
                    WHERE {
                        $this ex:total ?total ;
                              ex:lineItem ?item .
                        {
                            SELECT $this (SUM(?itemTotal) AS ?calculatedTotal)
                            WHERE {
                                $this ex:lineItem ?item .
                                ?item ex:price ?price ;
                                      ex:quantity ?qty .
                                BIND(?price * ?qty AS ?itemTotal)
                            }
                            GROUP BY $this
                        }
                        FILTER (?total != ?calculatedTotal)
                    }
                """ ;
            ] .

        ex:LineItemShape
            a sh:NodeShape ;
            sh:property [
                sh:path ex:price ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:quantity ;
                sh:datatype xsd:integer ;
                sh:minInclusive 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          LineItem: {
            type: 'object',
            title: 'LineItem',
            additionalProperties: true,
            properties: {
              price: {
                type: 'number',
                exclusiveMinimum: 0,
              },
              quantity: {
                type: 'integer',
                minimum: 1,
              },
            },
            required: ['price', 'quantity'],
          },
          Order: {
            type: 'object',
            title: 'Order',
            additionalProperties: true,
            properties: {
              orderId: {
                type: 'string',
                pattern: '^ORD-[0-9]{6}$',
              },
              total: {
                type: 'number',
                minimum: 0,
              },
              lineItem: {
                type: 'array',
                items: {
                  $ref: '#/$defs/LineItem',
                },
                minItems: 1,
              },
            },
            required: ['orderId', 'total', 'lineItem'],
            'x-shacl-sparql': [
              {
                message: 'Order total must match sum of line items',
                select: `
                    SELECT $this ?total ?calculatedTotal
                    WHERE {
                        $this ex:total ?total ;
                              ex:lineItem ?item .
                        {
                            SELECT $this (SUM(?itemTotal) AS ?calculatedTotal)
                            WHERE {
                                $this ex:lineItem ?item .
                                ?item ex:price ?price ;
                                      ex:quantity ?qty .
                                BIND(?price * ?qty AS ?itemTotal)
                            }
                            GROUP BY $this
                        }
                        FILTER (?total != ?calculatedTotal)
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Order',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL with UNION patterns for contact validation', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ContactShape
            a sh:NodeShape ;
            sh:targetClass ex:Contact ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:email ;
                sh:datatype xsd:string ;
                sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.[\\\\w]+$" ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:phone ;
                sh:datatype xsd:string ;
                sh:pattern "^\\\\+?[1-9]\\\\d{1,14}$" ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Must have either email or phone" ;
                sh:select """
                    SELECT $this
                    WHERE {
                        FILTER NOT EXISTS {
                            { $this ex:email ?email }
                            UNION
                            { $this ex:phone ?phone }
                        }
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Contact: {
            type: 'object',
            title: 'Contact',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
                minLength: 1,
              },
              email: {
                type: 'string',
                pattern: '^[\\w.-]+@[\\w.-]+\\.[\\w]+$',
              },
              phone: {
                type: 'string',
                pattern: '^\\+?[1-9]\\d{1,14}$',
              },
            },
            required: ['name'],
            'x-shacl-sparql': [
              {
                message: 'Must have either email or phone',
                select: `
                    SELECT $this
                    WHERE {
                        FILTER NOT EXISTS {
                            { $this ex:email ?email }
                            UNION
                            { $this ex:phone ?phone }
                        }
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Contact',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });
  });

  describe('SPARQL Constraints with Data Validation', () => {
    it('should handle SPARQL validating date ranges', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EventShape
            a sh:NodeShape ;
            sh:targetClass ex:Event ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:startDate ;
                sh:datatype xsd:date ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:endDate ;
                sh:datatype xsd:date ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "End date must be after start date" ;
                sh:select """
                    SELECT $this ?start ?end
                    WHERE {
                        $this ex:startDate ?start ;
                              ex:endDate ?end .
                        FILTER (?end <= ?start)
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Event: {
            type: 'object',
            title: 'Event',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
                minLength: 1,
              },
              startDate: {
                type: 'string',
                format: 'date',
              },
              endDate: {
                type: 'string',
                format: 'date',
              },
            },
            required: ['name', 'startDate', 'endDate'],
            'x-shacl-sparql': [
              {
                message: 'End date must be after start date',
                select: `
                    SELECT $this ?start ?end
                    WHERE {
                        $this ex:startDate ?start ;
                              ex:endDate ?end .
                        FILTER (?end <= ?start)
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Event',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL with mathematical operations for area calculation', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:RectangleShape
            a sh:NodeShape ;
            sh:targetClass ex:Rectangle ;
            sh:property [
                sh:path ex:width ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:height ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:area ;
                sh:datatype xsd:decimal ;
                sh:minExclusive 0.0 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Area must equal width * height" ;
                sh:select """
                    SELECT $this ?area ?width ?height
                    WHERE {
                        $this ex:area ?area ;
                              ex:width ?width ;
                              ex:height ?height .
                        FILTER (?area != (?width * ?height))
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Rectangle: {
            type: 'object',
            title: 'Rectangle',
            additionalProperties: true,
            properties: {
              width: {
                type: 'number',
                exclusiveMinimum: 0,
              },
              height: {
                type: 'number',
                exclusiveMinimum: 0,
              },
              area: {
                type: 'number',
                exclusiveMinimum: 0,
              },
            },
            required: ['width', 'height', 'area'],
            'x-shacl-sparql': [
              {
                message: 'Area must equal width * height',
                select: `
                    SELECT $this ?area ?width ?height
                    WHERE {
                        $this ex:area ?area ;
                              ex:width ?width ;
                              ex:height ?height .
                        FILTER (?area != (?width * ?height))
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Rectangle',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL with string operations for name validation', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:PersonShape
            a sh:NodeShape ;
            sh:targetClass ex:Person ;
            sh:property [
                sh:path ex:firstName ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:lastName ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:displayName ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Display name must be concatenation of first and last name" ;
                sh:select """
                    SELECT $this ?displayName ?firstName ?lastName
                    WHERE {
                        $this ex:displayName ?displayName ;
                              ex:firstName ?firstName ;
                              ex:lastName ?lastName .
                        BIND(CONCAT(?firstName, " ", ?lastName) AS ?expected)
                        FILTER (?displayName != ?expected)
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Person: {
            type: 'object',
            title: 'Person',
            additionalProperties: true,
            properties: {
              firstName: {
                type: 'string',
                minLength: 1,
              },
              lastName: {
                type: 'string',
                minLength: 1,
              },
              displayName: {
                type: 'string',
              },
            },
            required: ['firstName', 'lastName', 'displayName'],
            'x-shacl-sparql': [
              {
                message: 'Display name must be concatenation of first and last name',
                select: `
                    SELECT $this ?displayName ?firstName ?lastName
                    WHERE {
                        $this ex:displayName ?displayName ;
                              ex:firstName ?firstName ;
                              ex:lastName ?lastName .
                        BIND(CONCAT(?firstName, " ", ?lastName) AS ?expected)
                        FILTER (?displayName != ?expected)
                    }
                `,
              },
            ],
          },
        },
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

  describe('SPARQL with External References', () => {
    it('should handle SPARQL checking external resource existence', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:EmployeeShape
            a sh:NodeShape ;
            sh:targetClass ex:Employee ;
            sh:property [
                sh:path ex:employeeId ;
                sh:datatype xsd:string ;
                sh:pattern "^EMP-[0-9]{6}$" ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minLength 1 ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:department ;
                sh:class ex:Department ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:sparql [
                sh:message "Department reference must exist" ;
                sh:select """
                    SELECT $this ?dept
                    WHERE {
                        $this ex:department ?dept .
                        FILTER NOT EXISTS {
                            ?dept a ex:Department .
                        }
                    }
                """ ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Employee: {
            type: 'object',
            title: 'Employee',
            additionalProperties: true,
            properties: {
              employeeId: {
                type: 'string',
                pattern: '^EMP-[0-9]{6}$',
              },
              name: {
                type: 'string',
                minLength: 1,
              },
              department: {
                $ref: '#/$defs/Department',
              },
            },
            required: ['employeeId', 'name', 'department'],
            'x-shacl-sparql': [
              {
                message: 'Department reference must exist',
                select: `
                    SELECT $this ?dept
                    WHERE {
                        $this ex:department ?dept .
                        FILTER NOT EXISTS {
                            ?dept a ex:Department .
                        }
                    }
                `,
              },
            ],
          },
        },
        $ref: '#/$defs/Employee',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-shacl-prefixes': {
          ex: 'http://example.org/',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      });
    });

    it('should handle SPARQL with inverse relationship validation', async () => {
      const content = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:ManagerShape
            a sh:NodeShape ;
            sh:targetClass ex:Manager ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:manages ;
                sh:class ex:Employee ;
            ] ;
            sh:sparql [
                sh:message "If A manages B, then B must have A as manager" ;
                sh:select """
                    SELECT $this ?manages
                    WHERE {
                        $this ex:manages ?manages .
                        FILTER NOT EXISTS {
                            ?manages ex:manager $this .
                        }
                    }
                """ ;
            ] .

        ex:EmployeeShape
            a sh:NodeShape ;
            sh:targetClass ex:Employee ;
            sh:property [
                sh:path ex:name ;
                sh:datatype xsd:string ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
            ] ;
            sh:property [
                sh:path ex:manager ;
                sh:class ex:Manager ;
                sh:maxCount 1 ;
            ] .
      `;
      const ir = await getIr(content);
      const schema = new IrSchemaConverter(ir, { includeShaclExtensions: true }).convert();

      expect(schema).toStrictEqual({
        $defs: {
          Employee: {
            type: 'object',
            title: 'Employee',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
              manager: {
                $ref: '#/$defs/Manager',
              },
            },
            required: ['name'],
          },
          Manager: {
            type: 'object',
            title: 'Manager',
            additionalProperties: true,
            properties: {
              name: {
                type: 'string',
              },
              manages: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Employee',
                },
              },
            },
            required: ['name'],
            'x-shacl-sparql': [
              {
                message: 'If A manages B, then B must have A as manager',
                select: `
                    SELECT $this ?manages
                    WHERE {
                        $this ex:manages ?manages .
                        FILTER NOT EXISTS {
                            ?manages ex:manager $this .
                        }
                    }
                `,
              },
            ],
          },
        },
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
