import { DataFactory, Store } from 'n3';
import { DependencyGraphBuilder } from './dependency-graph';
import { Indexer } from './indexer';
import { StoreBuilder } from '../util/store-builder';
import {
  FOAF_PERSON,
  RDF_FIRST,
  RDF_NIL,
  RDF_REST,
  RDF_TYPE,
  SHACL_CLOSED,
  SHACL_IGNORED_PROPERTIES,
  SHACL_NODE_SHAPE,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_TARGET_CLASS,
  XSD_BOOLEAN,
} from '../util/rdf-terms';

describe('DependencyGraphBuilder', () => {
  describe('build', () => {
    it('should create empty dependency graph for store with no blank nodes', () => {
      const store = new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .build();
      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should create dependency graph with single blank node dependency', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .build();

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(1);
      expect(graph.dependencies.has(parentShape)).toBe(true);
      expect(graph.dependencies.get(parentShape)?.has('b1')).toBe(true);

      expect(graph.dependents.size).toBe(1);
      expect(graph.dependents.get('b1')).toStrictEqual(new Set().add(parentShape));
    });

    it('should create dependency graph with multiple blank node dependencies', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .triple(parentShape, SHACL_PROPERTY, 'b2', true)
        .triple(parentShape, SHACL_PROPERTY, 'b3', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .blank('b3', SHACL_PATH, 'http://example.org/email')
        .build();

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
      expect(graph.dependents.get('b1')).toStrictEqual(new Set().add(parentShape));
      expect(graph.dependents.get('b2')).toStrictEqual(new Set().add(parentShape));
      expect(graph.dependents.get('b3')).toStrictEqual(new Set().add(parentShape));
    });

    it('should handle multiple parent shapes with their own blank node dependencies', () => {
      const personShape = 'http://example.org/PersonShape';
      const companyShape = 'http://example.org/CompanyShape';
      const store = new StoreBuilder()
        .triple(personShape, SHACL_PROPERTY, 'b1', true)
        .triple(companyShape, SHACL_PROPERTY, 'b2', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/address')
        .build();

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
      expect(graph.dependents.get('b1')).toStrictEqual(new Set().add(personShape));
      expect(graph.dependents.get('b2')).toStrictEqual(new Set().add(companyShape));
    });

    it('should ignore named node objects (not create dependencies)', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .triple(parentShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .build();

      const indexer = new Indexer(store);
      const index = indexer.build();
      const builder = new DependencyGraphBuilder(index);
      const graph = builder.build();

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should ignore literal objects (not create dependencies)', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .triple(parentShape, 'http://www.w3.org/ns/shacl#maxCount', '1', false)
        .build();

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
      expect(graph.dependents.get('b1')).toStrictEqual(new Set().add(parentShape));
      expect(graph.dependents.get('b2')).toStrictEqual(new Set().add('b1'));
    });

    it('should handle blank nodes in RDF lists (sh:ignoredProperties)', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .triple(parentShape, SHACL_IGNORED_PROPERTIES, 'l1', true)
        .blank('l1', RDF_FIRST, RDF_TYPE)
        .blank('l2', RDF_FIRST, 'http://example.org/customProp')
        .blank('l2', RDF_REST, RDF_NIL)
        .build();
      store.addQuad(
        DataFactory.blankNode('l1'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        DataFactory.blankNode('l2')
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

      expect(graph.dependents.get('l1')).toStrictEqual(new Set().add(parentShape));
      expect(graph.dependents.get('l2')).toStrictEqual(new Set().add('l1'));
    });

    it('should handle mixed predicates with blank node and non-blank node objects', () => {
      const parentShape = 'http://example.org/PersonShape';
      // Need to manually add literal since StoreBuilder doesn't support literals
      const store = new StoreBuilder()
        .triple(parentShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .build();

      // Add literal predicate manually
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode(SHACL_CLOSED),
        DataFactory.literal('true', DataFactory.namedNode(XSD_BOOLEAN))
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
      expect(graph.dependents.get('b1')).toStrictEqual(new Set().add(parentShape));
    });

    it('should throw error when blank node has multiple parents', () => {
      const shape1 = 'http://example.org/Shape1';
      const shape2 = 'http://example.org/Shape2';
      const store = new StoreBuilder()
        .triple(shape1, SHACL_PROPERTY, 'b1', true)
        .triple(shape2, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .build();
      const indexer = new Indexer(store);
      const index = indexer.build();
      const dependencyGraph = new DependencyGraphBuilder(index).build();

      expect(dependencyGraph.dependencies.size).toBe(2);
      expect(dependencyGraph.dependencies.get(shape1)).toStrictEqual(new Set().add('b1'));
      expect(dependencyGraph.dependents.size).toBe(1);
      expect(dependencyGraph.dependents.get('b1')).toStrictEqual(new Set().add(shape1).add(shape2));
    });
  });
});
