import { ShaclDocumentBuilder } from './shacl-document-builder';
import { NamedNode, Quad } from 'n3';

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
      .add(
        new Quad(
          new NamedNode('test-1'),
          new NamedNode('sh:targetClass'),
          new NamedNode('foaf:Person')
        )
      )
      .add(new Quad(new NamedNode('test-2'), new NamedNode('sh:minCount'), new NamedNode('1')))
      .add(new Quad(new NamedNode('test-3'), new NamedNode('sh:stringRange'), new NamedNode('A_Z')))
      .add(
        new Quad(new NamedNode('test-4'), new NamedNode('sh:numberRange'), new NamedNode('1_4]'))
      )
      .build();
    expect(document).toBeDefined();
    expect(document.store.size).toBe(4);
    const triples = document.store
      .getQuads(null, null, null, null)
      .map((q) => [q.subject.value, q.predicate.value, q.object.value]);
    expect(triples).toEqual([
      ['test-1', 'sh:targetClass', 'foaf:Person'],
      ['test-2', 'sh:minCount', '1'],
      ['test-3', 'sh:stringRange', 'A_Z'],
      ['test-4', 'sh:numberRange', '1_4]'],
    ]);
  });
});
