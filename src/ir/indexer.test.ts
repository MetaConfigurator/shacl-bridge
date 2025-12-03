import { DataFactory, Store } from 'n3';
import { Indexer } from './indexer';

describe('Indexer', () => {
  describe('build', () => {
    it('should return empty indexes for an empty store', () => {
      const store = new Store();
      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.quadsIndex.size).toBe(0);
      expect(index.blankNodesIndex.size).toBe(0);
      expect(index.namedShapesIndex.size).toBe(0);
    });

    it('should index quads by subject', () => {
      const store = new Store();
      const subject = 'http://example.org/PersonShape';

      store.addQuad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.quadsIndex.size).toBe(1);
      expect(index.quadsIndex.has(subject)).toBe(true);

      const quads = index.quadsIndex.get(subject);
      expect(quads).toBeDefined();
      expect(quads?.length).toBe(2);
    });

    it('should identify blank nodes in blankNodesIndex', () => {
      const store = new Store();
      const blankNode = DataFactory.blankNode('b1');

      store.addQuad(
        blankNode,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.blankNodesIndex.size).toBe(1);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
    });

    it('should identify multiple blank nodes', () => {
      const store = new Store();
      const blankNode1 = DataFactory.blankNode('b1');
      const blankNode2 = DataFactory.blankNode('b2');
      const blankNode3 = DataFactory.blankNode('b3');

      store.addQuad(
        blankNode1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );
      store.addQuad(
        blankNode2,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/age')
      );
      store.addQuad(
        blankNode3,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#datatype'),
        DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#string')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.blankNodesIndex.size).toBe(3);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
      expect(index.blankNodesIndex.has('b2')).toBe(true);
      expect(index.blankNodesIndex.has('b3')).toBe(true);
    });

    it('should identify named NodeShapes in namedShapesIndex', () => {
      const store = new Store();
      const shapeSubject = 'http://example.org/PersonShape';

      store.addQuad(
        DataFactory.namedNode(shapeSubject),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(1);
      expect(index.namedShapesIndex.has(shapeSubject)).toBe(true);
    });

    it('should identify named PropertyShapes in namedShapesIndex', () => {
      const store = new Store();
      const shapeSubject = 'http://example.org/NamePropertyShape';

      store.addQuad(
        DataFactory.namedNode(shapeSubject),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(1);
      expect(index.namedShapesIndex.has(shapeSubject)).toBe(true);
    });

    it('should identify multiple named shapes', () => {
      const store = new Store();
      const nodeShape = 'http://example.org/PersonShape';
      const propertyShape = 'http://example.org/NameShape';

      store.addQuad(
        DataFactory.namedNode(nodeShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(propertyShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(2);
      expect(index.namedShapesIndex.has(nodeShape)).toBe(true);
      expect(index.namedShapesIndex.has(propertyShape)).toBe(true);
    });

    it('should NOT include blank node shapes in namedShapesIndex', () => {
      const store = new Store();
      const blankNode = DataFactory.blankNode('b1');

      store.addQuad(
        blankNode,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.blankNodesIndex.size).toBe(1);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
    });

    it('should recognize shape types with different namespace prefixes', () => {
      const store = new Store();
      const shape1 = 'http://example.org/Shape1';
      const shape2 = 'http://example.org/Shape2';

      // Using different URIs that end with 'type' (lowercase)
      store.addQuad(
        DataFactory.namedNode(shape1),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape2),
        DataFactory.namedNode('http://example.org/customtype'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(2);
      expect(index.namedShapesIndex.has(shape1)).toBe(true);
      expect(index.namedShapesIndex.has(shape2)).toBe(true);
    });

    it('should handle mixed named nodes and blank nodes', () => {
      const store = new Store();
      const namedShape = 'http://example.org/PersonShape';
      const blankNode = DataFactory.blankNode('b1');

      store.addQuad(
        DataFactory.namedNode(namedShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(namedShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode
      );
      store.addQuad(
        blankNode,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.quadsIndex.size).toBe(2);
      expect(index.quadsIndex.has(namedShape)).toBe(true);
      expect(index.quadsIndex.has('b1')).toBe(true);

      expect(index.namedShapesIndex.size).toBe(1);
      expect(index.namedShapesIndex.has(namedShape)).toBe(true);

      expect(index.blankNodesIndex.size).toBe(1);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
    });

    it('should index quads from multiple subjects', () => {
      const store = new Store();
      const subject1 = 'http://example.org/Subject1';
      const subject2 = 'http://example.org/Subject2';

      store.addQuad(
        DataFactory.namedNode(subject1),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#name'),
        DataFactory.literal('First')
      );
      store.addQuad(
        DataFactory.namedNode(subject2),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#name'),
        DataFactory.literal('Second')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.quadsIndex.size).toBe(2);
      expect(index.quadsIndex.has(subject1)).toBe(true);
      expect(index.quadsIndex.has(subject2)).toBe(true);
    });

    it('should NOT identify non-shape types as named shapes', () => {
      const store = new Store();
      const subject = 'http://example.org/Person';

      store.addQuad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.quadsIndex.size).toBe(1);
    });

    it('should handle predicates that do not end with "type"', () => {
      const store = new Store();
      const subject = 'http://example.org/PersonShape';

      store.addQuad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.quadsIndex.has(subject)).toBe(true);
    });

    it('should handle objects that do not end with NodeShape or PropertyShape', () => {
      const store = new Store();
      const subject = 'http://example.org/PersonShape';

      store.addQuad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#Shape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.quadsIndex.has(subject)).toBe(true);
    });

    it('should handle complex SHACL document with all types of nodes', () => {
      const store = new Store();
      const personShape = 'http://example.org/PersonShape';
      const companyShape = 'http://example.org/CompanyShape';
      const blankProp1 = DataFactory.blankNode('b1');
      const blankProp2 = DataFactory.blankNode('b2');

      // Named NodeShape
      store.addQuad(
        DataFactory.namedNode(personShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(personShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );
      store.addQuad(
        DataFactory.namedNode(personShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankProp1
      );

      // Named PropertyShape
      store.addQuad(
        DataFactory.namedNode(companyShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );

      // Blank node property shape
      store.addQuad(
        blankProp1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );
      store.addQuad(
        blankProp1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#datatype'),
        DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#string')
      );

      // Another blank node
      store.addQuad(
        blankProp2,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/age')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      // Should have 4 subjects in quads index
      expect(index.quadsIndex.size).toBe(4);
      expect(index.quadsIndex.has(personShape)).toBe(true);
      expect(index.quadsIndex.has(companyShape)).toBe(true);
      expect(index.quadsIndex.has('b1')).toBe(true);
      expect(index.quadsIndex.has('b2')).toBe(true);

      // Should have 2 named shapes
      expect(index.namedShapesIndex.size).toBe(2);
      expect(index.namedShapesIndex.has(personShape)).toBe(true);
      expect(index.namedShapesIndex.has(companyShape)).toBe(true);

      // Should have 2 blank nodes
      expect(index.blankNodesIndex.size).toBe(2);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
      expect(index.blankNodesIndex.has('b2')).toBe(true);
    });

    it('should handle RDF list nodes as blank nodes', () => {
      const store = new Store();
      const shape = 'http://example.org/PersonShape';
      const listNode1 = DataFactory.blankNode('l1');
      const listNode2 = DataFactory.blankNode('l2');

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#ignoredProperties'),
        listNode1
      );
      store.addQuad(
        listNode1,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      );
      store.addQuad(
        listNode1,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        listNode2
      );
      store.addQuad(
        listNode2,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        DataFactory.namedNode('http://example.org/customProp')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.blankNodesIndex.size).toBe(2);
      expect(index.blankNodesIndex.has('l1')).toBe(true);
      expect(index.blankNodesIndex.has('l2')).toBe(true);

      expect(index.quadsIndex.has('l1')).toBe(true);
      expect(index.quadsIndex.has('l2')).toBe(true);
    });
  });
});
