import { ShaclReader } from './shacl-reader';
import path from 'node:path';

const SIMPLE_SHACL = `
@prefix ex:   <http://example.org/> .
@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

ex:PersonShape
    a                sh:NodeShape ;
    sh:targetClass   ex:Person ;
    sh:property [
        sh:path     ex:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
    ] .
`;

describe('ShaclReader', () => {
  it('should convert SHACL content to JSON Schema', async () => {
    const result = await new ShaclReader().fromContent(SIMPLE_SHACL).convert();

    expect(result).toEqual({
      $defs: {
        Person: {
          additionalProperties: true,
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
          title: 'Person',
          type: 'object',
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

  it('should convert SHACL file to JSON Schema', async () => {
    const filePath = path.resolve(__dirname, '../../../samples/shacl/simple-shacl.ttl');
    const result = await new ShaclReader().fromPath(filePath).convert();

    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(result.$defs).toBeDefined();
  });

  it('should support excludeShaclExtensions option', async () => {
    const result = await new ShaclReader()
      .fromContent(SIMPLE_SHACL)
      .withOptions({ excludeShaclExtensions: true })
      .convert();

    expect(result['x-shacl-prefixes']).toBeUndefined();
  });

  it('should convert JSON-LD content to JSON Schema', async () => {
    const jsonLdContent = JSON.stringify({
      '@context': {
        sh: 'http://www.w3.org/ns/shacl#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        ex: 'http://example.org/',
      },
      '@id': 'ex:NameShape',
      '@type': 'sh:NodeShape',
      'sh:targetClass': { '@id': 'ex:Name' },
      'sh:property': {
        'sh:path': { '@id': 'ex:value' },
        'sh:datatype': { '@id': 'xsd:string' },
        'sh:minCount': 1,
        'sh:maxCount': 1,
      },
    });

    const result = await new ShaclReader().fromJsonLdContent(jsonLdContent).convert();

    expect(result.$defs).toBeDefined();
  });

  it('should convert JSON-LD file to JSON Schema', async () => {
    const filePath = path.resolve(__dirname, '../../../samples/shacl/simple-shacl.jsonld');
    const result = await new ShaclReader().fromJsonLdPath(filePath).convert();

    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(result.$defs).toBeDefined();
  });

  it('should throw when calling convert without specifying input', async () => {
    await expect(new ShaclReader().convert()).rejects.toThrow();
  });

  it('should throw when setting input twice', () => {
    const reader = new ShaclReader().fromContent(SIMPLE_SHACL);
    expect(() => reader.fromContent(SIMPLE_SHACL)).toThrow();
  });
});
