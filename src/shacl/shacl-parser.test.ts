import { ShaclParser } from './shacl-parser';
import { ShaclDocument } from './shacl-document';

describe('SHACL Parser', () => {
  it('should parse and return the shacl document', async () => {
    let shaclParser = new ShaclParser('src/shacl/sample-shacl.ttl');
    let parsed = await shaclParser.parse();
    expect(parsed).toBeDefined();
    expect(parsed).toBeInstanceOf(ShaclDocument);
    expect(parsed.prefix).toEqual(
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
  });
});
