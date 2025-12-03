import { DataFactory, Store } from 'n3';
import { DependencyGraphBuilder } from './dependency-graph';
import { Indexer } from './indexer';

describe('DependencyGraphBuilder', () => {
  describe('build', () => {
    it('should create empty dependency graph for store with no blank nodes', () => {
      const store = new Store();
      store.addQuad(
        DataFactory.namedNode('http://example.org/PersonShape'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should create dependency graph with single blank node dependency', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankNodeId = DataFactory.blankNode('b1');

      // Parent shape pointing to blank node
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNodeId
      );

      // Blank node properties
      store.addQuad(
        blankNodeId,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(1);
      expect(graph.dependencies.has(parentShape)).toBe(true);
      expect(graph.dependencies.get(parentShape)?.has('b1')).toBe(true);

      expect(graph.dependents.size).toBe(1);
      expect(graph.dependents.get('b1')).toBe(parentShape);
    });

    it('should create dependency graph with multiple blank node dependencies', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankNode1 = DataFactory.blankNode('b1');
      const blankNode2 = DataFactory.blankNode('b2');
      const blankNode3 = DataFactory.blankNode('b3');

      // Parent shape pointing to multiple blank nodes
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode1
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode2
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode3
      );

      // Blank node properties
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
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/email')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(1);
      expect(graph.dependencies.has(parentShape)).toBe(true);

      const deps = graph.dependencies.get(parentShape);
      expect(deps?.size).toBe(3);
      expect(deps?.has('b1')).toBe(true);
      expect(deps?.has('b2')).toBe(true);
      expect(deps?.has('b3')).toBe(true);

      expect(graph.dependents.size).toBe(3);
      expect(graph.dependents.get('b1')).toBe(parentShape);
      expect(graph.dependents.get('b2')).toBe(parentShape);
      expect(graph.dependents.get('b3')).toBe(parentShape);
    });

    it('should handle multiple parent shapes with their own blank node dependencies', () => {
      const store = new Store();
      const personShape = 'http://example.org/PersonShape';
      const companyShape = 'http://example.org/CompanyShape';
      const blankNode1 = DataFactory.blankNode('b1');
      const blankNode2 = DataFactory.blankNode('b2');

      // PersonShape pointing to blank node
      store.addQuad(
        DataFactory.namedNode(personShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode1
      );

      // CompanyShape pointing to blank node
      store.addQuad(
        DataFactory.namedNode(companyShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode2
      );

      // Blank node properties
      store.addQuad(
        blankNode1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );
      store.addQuad(
        blankNode2,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/address')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(2);
      expect(graph.dependencies.has(personShape)).toBe(true);
      expect(graph.dependencies.has(companyShape)).toBe(true);
      expect(graph.dependencies.get(personShape)?.has('b1')).toBe(true);
      expect(graph.dependencies.get(companyShape)?.has('b2')).toBe(true);

      expect(graph.dependents.size).toBe(2);
      expect(graph.dependents.get('b1')).toBe(personShape);
      expect(graph.dependents.get('b2')).toBe(companyShape);
    });

    it('should ignore named node objects (not create dependencies)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';

      // Parent shape pointing to named node (not a blank node)
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should ignore literal objects (not create dependencies)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';

      // Parent shape with literal value
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#maxCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should handle nested blank nodes (blank node pointing to another blank node)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankNode1 = DataFactory.blankNode('b1');
      const blankNode2 = DataFactory.blankNode('b2');

      // Parent shape pointing to first blank node
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode1
      );

      // First blank node pointing to second blank node
      store.addQuad(
        blankNode1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#node'),
        blankNode2
      );

      // Second blank node properties
      store.addQuad(
        blankNode2,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/address')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(2);

      // Parent shape depends on blankNode1
      expect(graph.dependencies.has(parentShape)).toBe(true);
      expect(graph.dependencies.get(parentShape)?.has('b1')).toBe(true);

      // BlankNode1 depends on blankNode2
      expect(graph.dependencies.has('b1')).toBe(true);
      expect(graph.dependencies.get('b1')?.has('b2')).toBe(true);

      expect(graph.dependents.size).toBe(2);
      expect(graph.dependents.get('b1')).toBe(parentShape);
      expect(graph.dependents.get('b2')).toBe('b1');
    });

    it('should handle blank nodes in RDF lists (sh:ignoredProperties)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const listNode1 = DataFactory.blankNode('l1');
      const listNode2 = DataFactory.blankNode('l2');

      // Parent shape with list
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#ignoredProperties'),
        listNode1
      );

      // List structure
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
      store.addQuad(
        listNode2,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(2);

      // Parent shape depends on first list node
      expect(graph.dependencies.has(parentShape)).toBe(true);
      expect(graph.dependencies.get(parentShape)?.has('l1')).toBe(true);

      // First list node depends on second list node (via rdf:rest)
      expect(graph.dependencies.has('l1')).toBe(true);
      expect(graph.dependencies.get('l1')?.has('l2')).toBe(true);

      expect(graph.dependents.get('l1')).toBe(parentShape);
      expect(graph.dependents.get('l2')).toBe('l1');
    });

    it('should handle mixed predicates with blank node and non-blank node objects', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankNode1 = DataFactory.blankNode('b1');

      // Mixed predicates
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode1
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#closed'),
        DataFactory.literal(
          'true',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean')
        )
      );

      store.addQuad(
        blankNode1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/name')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      // Only the blank node should create a dependency
      expect(graph.dependencies.size).toBe(1);
      expect(graph.dependencies.has(parentShape)).toBe(true);
      expect(graph.dependencies.get(parentShape)?.size).toBe(1);
      expect(graph.dependencies.get(parentShape)?.has('b1')).toBe(true);

      expect(graph.dependents.size).toBe(1);
      expect(graph.dependents.get('b1')).toBe(parentShape);
    });
  });
});
