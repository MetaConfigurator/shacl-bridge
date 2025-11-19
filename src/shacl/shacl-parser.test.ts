import { ShaclParser } from './shacl-parser';
import { ShaclDocument } from './model/shacl-document';

describe('SHACL Parser', () => {
  const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';
  const pathToComplexShacl = 'samples/shacl/complex-shacl.ttl';

  it('should parse simple shacl file accurately', async () => {
    const shaclParser = new ShaclParser(pathToSimpleShacl);
    const shaclDocument = await shaclParser.parse();
    expect(shaclDocument).toBeDefined();
    expect(shaclDocument).toBeInstanceOf(ShaclDocument);
    expect(shaclDocument.prefix.size).toBe(5);
    expect(shaclDocument.prefix).toEqual(
      new Map([
        ['ex', 'http://example.org/'],
        ['sh', 'http://www.w3.org/ns/shacl#'],
        ['foaf', 'http://xmlns.com/foaf/0.1/'],
        ['rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
        ['xsd', 'http://www.w3.org/2001/XMLSchema#'],
      ])
    );
    expect(shaclDocument.store.size).toBeGreaterThan(0);
    expect(shaclDocument.store.size).toBe(15);
    expect(
      shaclDocument.store
        .getQuads(null, null, null, null)
        .map((q) => [q.subject.value, q.predicate.value, q.object.value])
    ).toEqual([
      [
        'http://example.org/PersonShape',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://www.w3.org/ns/shacl#NodeShape',
      ],
      [
        'http://example.org/PersonShape',
        'http://www.w3.org/ns/shacl#targetClass',
        'http://xmlns.com/foaf/0.1/Person',
      ],
      ['http://example.org/PersonShape', 'http://www.w3.org/ns/shacl#property', 'n3-0'],
      ['http://example.org/PersonShape', 'http://www.w3.org/ns/shacl#property', 'n3-1'],
      ['http://example.org/PersonShape', 'http://www.w3.org/ns/shacl#closed', 'true'],
      ['http://example.org/PersonShape', 'http://www.w3.org/ns/shacl#ignoredProperties', 'n3-2'],
      ['n3-0', 'http://www.w3.org/ns/shacl#path', 'http://example.org/ssn'],
      ['n3-0', 'http://www.w3.org/ns/shacl#maxCount', '1'],
      ['n3-0', 'http://www.w3.org/ns/shacl#datatype', 'http://www.w3.org/2001/XMLSchema#string'],
      ['n3-0', 'http://www.w3.org/ns/shacl#pattern', '^\\d{3}-\\d{2}-\\d{4}$'],
      ['n3-1', 'http://www.w3.org/ns/shacl#path', 'http://example.org/worksFor'],
      ['n3-1', 'http://www.w3.org/ns/shacl#class', 'http://example.org/Company'],
      ['n3-1', 'http://www.w3.org/ns/shacl#nodeKind', 'http://www.w3.org/ns/shacl#IRI'],
      [
        'n3-2',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      ],
      [
        'n3-2',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil',
      ],
    ]);
  });

  it('should parse complex turtle file accurately', async () => {
    const shaclParser = new ShaclParser(pathToComplexShacl);
    const parsedResult = await shaclParser.parse();
    expect(parsedResult).toBeDefined();
    expect(parsedResult).toBeInstanceOf(ShaclDocument);
    expect(parsedResult.prefix.size).toBe(8);
    expect(parsedResult.prefix).toEqual(
      new Map([
        ['sh', 'http://www.w3.org/ns/shacl#'],
        ['ex', 'http://example.org/'],
        ['foaf', 'http://xmlns.com/foaf/0.1/'],
        ['xsd', 'http://www.w3.org/2001/XMLSchema#'],
        ['rdfs', 'http://www.w3.org/2000/01/rdf-schema#'],
        ['schema', 'http://schema.org/'],
        ['rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
        ['', '#'],
      ])
    );
    expect(parsedResult.store.size).toBeGreaterThan(0);
    expect(parsedResult.store.size).toBe(184);
  });
});
