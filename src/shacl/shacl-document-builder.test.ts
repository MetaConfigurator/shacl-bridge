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

  it('should add triple correctly', () => {
    const builder = new ShaclDocumentBuilder();
    const document = builder
      .setTriple({ subject: 'test-1', predicate: 'sh:targetClass ', object: 'foaf:Person' })
      .setTriple({ subject: 'test-2', predicate: 'sh:minCount', object: 1 })
      .setTriple({ subject: 'test-3', predicate: 'sh:stringRange', object: ['A', 'B', 'C', 'D'] })
      .setTriple({ subject: 'test-4', predicate: 'sh:numberRange', object: [1, 2, 3, 4] })
      .build();
    expect(document).toBeDefined();
    expect(document.shapes.length).toBe(4);
    expect(document.shapes).toEqual([
      { subject: 'test-1', predicate: 'sh:targetClass ', object: 'foaf:Person' },
      { subject: 'test-2', predicate: 'sh:minCount', object: 1 },
      { subject: 'test-3', predicate: 'sh:stringRange', object: ['A', 'B', 'C', 'D'] },
      { subject: 'test-4', predicate: 'sh:numberRange', object: [1, 2, 3, 4] },
    ]);
  });
});
