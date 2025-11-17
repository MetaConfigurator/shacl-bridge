import { ShaclDocumentBuilder } from './shacl-document-builder';

describe('SHACL Document Builder', () => {
  it('should add prefix correctly', () => {
    const builder = new ShaclDocumentBuilder();
    const document = builder.setPrefix('sh', 'http://www.w3.org/ns/shacl#').build();
    expect(document).toBeDefined();
    expect(document.prefix).toEqual(new Map([['sh', 'http://www.w3.org/ns/shacl#']]));
  });

  it('should add multiple prefixes correctly', () => {
    const builder = new ShaclDocumentBuilder();
    const document = builder
      .setPrefix('sh', 'http://www.w3.org/ns/shacl#')
      .setPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
      .build();
    expect(document).toBeDefined();
    expect(document.prefix).toEqual(
      new Map([
        ['sh', 'http://www.w3.org/ns/shacl#'],
        ['rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
      ])
    );
  });
});
