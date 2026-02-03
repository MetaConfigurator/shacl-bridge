import { ShaclParser } from './shacl-parser';
import * as fs from 'fs';

describe('SHACL Parser', () => {
  const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';
  const pathToComplexShacl = 'samples/shacl/complex-shacl.ttl';
  const pathToSimpleJsonLd = 'samples/shacl/simple-shacl.jsonld';

  it('should parse simple shacl file accurately', async () => {
    const shaclDocument = await new ShaclParser().withPath(pathToSimpleShacl).parse();
    expect(shaclDocument).toBeDefined();
    expect(Object.keys(shaclDocument.prefix).length).toBe(5);
    expect(shaclDocument.prefix).toEqual({
      ex: 'http://example.org/',
      sh: 'http://www.w3.org/ns/shacl#',
      foaf: 'http://xmlns.com/foaf/0.1/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    });
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
    const shaclDocument = await new ShaclParser().withPath(pathToComplexShacl).parse();
    expect(shaclDocument).toBeDefined();
    expect(Object.keys(shaclDocument.prefix).length).toBe(8);
    expect(shaclDocument.prefix).toEqual({
      sh: 'http://www.w3.org/ns/shacl#',
      ex: 'http://example.org/',
      foaf: 'http://xmlns.com/foaf/0.1/',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      schema: 'http://schema.org/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      '': '#',
    });
    expect(shaclDocument.store.size).toBeGreaterThan(0);
    expect(shaclDocument.store.size).toBe(184);
  });

  it('should throw error when trying to set both options, final option is content', () => {
    expect(() =>
      new ShaclParser().withPath(pathToSimpleShacl).withContent('some content').parse()
    ).toThrow(new Error('Cannot set an(other) option after specifying it once'));
  });

  it('should throw error when trying to set both options, final option is path', () => {
    expect(() =>
      new ShaclParser().withContent('some content').withPath(pathToSimpleShacl).parse()
    ).toThrow(new Error('Cannot set an(other) option after specifying it once'));
  });

  it('should throw error when trying to set content more than once', () => {
    expect(() =>
      new ShaclParser().withContent('some content').withContent('some content').parse()
    ).toThrow(new Error('Cannot set an(other) option after specifying it once'));
  });

  it('should throw error when trying to set file path more than once', () => {
    expect(() =>
      new ShaclParser().withPath(pathToSimpleShacl).withPath(pathToSimpleShacl).parse()
    ).toThrow(new Error('Cannot set an(other) option after specifying it once'));
  });

  it('should parse JSON-LD file with withJsonLdPath', async () => {
    const shaclDocument = await new ShaclParser().withJsonLdPath(pathToSimpleJsonLd).parse();
    expect(shaclDocument).toBeDefined();
    expect(shaclDocument.store.size).toBeGreaterThan(0);

    // Verify key triples are present
    const quads = shaclDocument.store.getQuads(null, null, null, null);
    const tripleStrings = quads.map(
      (q) => `${q.subject.value} ${q.predicate.value} ${q.object.value}`
    );

    expect(
      tripleStrings.some((s) =>
        s.includes('http://example.org/PersonShape http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      )
    ).toBe(true);
    expect(
      tripleStrings.some((s) =>
        s.includes('http://example.org/PersonShape http://www.w3.org/ns/shacl#targetClass')
      )
    ).toBe(true);
  });

  it('should parse JSON-LD content with withJsonLdContent', async () => {
    const jsonLdContent = fs.readFileSync(pathToSimpleJsonLd, 'utf8');
    const shaclDocument = await new ShaclParser().withJsonLdContent(jsonLdContent).parse();

    expect(shaclDocument).toBeDefined();
    expect(shaclDocument.store.size).toBeGreaterThan(0);

    // Verify key triples are present
    const quads = shaclDocument.store.getQuads(null, null, null, null);
    const tripleStrings = quads.map(
      (q) => `${q.subject.value} ${q.predicate.value} ${q.object.value}`
    );

    expect(
      tripleStrings.some((s) =>
        s.includes('http://example.org/PersonShape http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      )
    ).toBe(true);
  });

  it('should throw error when mixing JSON-LD and Turtle methods', () => {
    expect(() =>
      new ShaclParser().withJsonLdPath(pathToSimpleJsonLd).withPath(pathToSimpleShacl).parse()
    ).toThrow(new Error('Cannot set an(other) option after specifying it once'));
  });

  it('should throw error when trying to set JSON-LD content more than once', () => {
    const jsonLdContent = fs.readFileSync(pathToSimpleJsonLd, 'utf8');
    expect(() =>
      new ShaclParser().withJsonLdContent(jsonLdContent).withJsonLdContent(jsonLdContent).parse()
    ).toThrow(new Error('Cannot set an(other) option after specifying it once'));
  });
});
