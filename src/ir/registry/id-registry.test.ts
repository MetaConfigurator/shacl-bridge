import { ShaclDocument } from '../../shacl/model/shacl-document';
import { ShaclParser } from '../../shacl/shacl-parser';
import { IdRegistry } from './id-registry';

let simpleShaclDocument: ShaclDocument;
const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';

describe('id-registry', () => {
  beforeEach(async () => {
    simpleShaclDocument = await new ShaclParser(pathToSimpleShacl).parse();
  });

  it('should create ID Mappings', () => {
    const idRegistry = new IdRegistry(simpleShaclDocument.store);
    expect(idRegistry).toBeDefined();
    expect(idRegistry.getIdMapping('n3-0')).toStrictEqual({
      n3Node: 'n3-0',
      property: 'http://example.org/ssn',
      shape: 'http://example.org/PersonShape',
    });
    expect(idRegistry.getIdMapping('n3-1')).toStrictEqual({
      n3Node: 'n3-1',
      property: 'http://example.org/worksFor',
      shape: 'http://example.org/PersonShape',
    });
    expect(idRegistry.getIdMapping('n3-2')).toStrictEqual({
      n3Node: 'n3-2',
      property: null,
      shape: 'http://example.org/PersonShape',
    });
  });

  it('querying invalid ID Mapping returns undefined', () => {
    const idRegistry = new IdRegistry(simpleShaclDocument.store);
    expect(idRegistry).toBeDefined();
    expect(idRegistry.getIdMapping('n3-9')).toBeUndefined();
  });
});
