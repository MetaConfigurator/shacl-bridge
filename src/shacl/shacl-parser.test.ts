import { ShaclParser } from './shacl-parser';
import { ShaclDocument } from './model/shacl-document';

describe('SHACL Parser', () => {
  const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';
  const pathToComplexShacl = 'samples/shacl/complex-shacl.ttl';

  it('should parse simple shacl file accurately', async () => {
    const shaclParser = new ShaclParser(pathToSimpleShacl);
    const parsedResult = await shaclParser.parse();
    expect(parsedResult).toBeDefined();
    expect(parsedResult).toBeInstanceOf(ShaclDocument);
    expect(parsedResult.prefix.size).toBe(5);
    expect(parsedResult.prefix).toEqual(
      new Map([
        ['ex', 'http://example.org/'],
        ['sh', 'http://www.w3.org/ns/shacl#'],
        ['foaf', 'http://xmlns.com/foaf/0.1/'],
        ['rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
        ['xsd', 'http://www.w3.org/2001/XMLSchema#'],
      ])
    );
    expect(parsedResult.shapes.length).toBeGreaterThan(0);
    expect(parsedResult.shapes.length).toBe(15);
    expect(parsedResult.idMappings.size).toBe(3);
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
    expect(parsedResult.shapes.length).toBeGreaterThan(0);
    // TODO: Verify these assertions
    expect(parsedResult.shapes.length).toBe(184);
    expect(parsedResult.idMappings.size).toBe(46);
  });
});
