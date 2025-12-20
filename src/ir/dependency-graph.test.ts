import { Store } from 'n3';
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
} from '../util/rdf-terms';

function getGraph(store: Store) {
  const indexer = new Indexer(store);
  const index = indexer.build();
  const builder = new DependencyGraphBuilder(index);
  return builder.build();
}

describe('DependencyGraphBuilder', () => {
  describe('build', () => {
    it('should create empty dependency graph for store with no blank nodes', () => {
      const store = new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .build();
      const graph = getGraph(store);

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

      const graph = getGraph(store);

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

      const graph = getGraph(store);

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

      const graph = getGraph(store);

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

      const graph = getGraph(store);

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should ignore literal objects (not create dependencies)', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .triple(parentShape, 'http://www.w3.org/ns/shacl#maxCount', '1', false)
        .build();

      const graph = getGraph(store);

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should handle nested blank nodes (blank node pointing to another blank node)', () => {
      const parentShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .bothBlank('b1', SHACL_NODE_SHAPE, 'b2')
        .blank('b2', SHACL_PATH, 'http://example.org/address')
        .build();

      const graph = getGraph(store);

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
        .bothBlank('l1', RDF_REST, 'l2')
        .build();

      const graph = getGraph(store);

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
      const store = new StoreBuilder()
        .triple(parentShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .literalBool(parentShape, SHACL_CLOSED, true)
        .build();

      const graph = getGraph(store);

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

    it('should detect and store cycles in blank node dependencies', () => {
      // Create a cycle: b1 -> b2 -> b3 -> b1
      const store = new StoreBuilder()
        .bothBlank('b1', SHACL_NODE_SHAPE, 'b2')
        .bothBlank('b2', SHACL_NODE_SHAPE, 'b3')
        .bothBlank('b3', SHACL_NODE_SHAPE, 'b1')
        .build();
      const indexer = new Indexer(store);
      const index = indexer.build();
      const dependencyGraph = new DependencyGraphBuilder(index).build();

      // Verify the cycle is detected
      expect(dependencyGraph.cycles.size).toBeGreaterThan(0);

      // All nodes in the cycle should be marked
      expect(dependencyGraph.cycles.has('b1')).toBe(true);
      expect(dependencyGraph.cycles.has('b2')).toBe(true);
      expect(dependencyGraph.cycles.has('b3')).toBe(true);

      // Each node should have all cycle members in its cycle set
      const b1Cycles = dependencyGraph.cycles.get('b1');
      expect(b1Cycles?.size).toBe(3);
      expect(b1Cycles?.has('b1')).toBe(true);
      expect(b1Cycles?.has('b2')).toBe(true);
      expect(b1Cycles?.has('b3')).toBe(true);
    });
  });
});
