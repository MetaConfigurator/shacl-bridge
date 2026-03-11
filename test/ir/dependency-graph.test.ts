import { DependencyGraphBuilder } from '../../src/ir/dependency-graph';
import { Indexer } from '../../src/ir/indexer';
import { StoreBuilder } from '../../src/store/store-builder';
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
} from '../../src/shacl/shacl-terms';
import { ShaclParser } from '../../src/shacl/parser/shacl-parser';
import { DataFactory, Term } from 'n3';

async function getGraph(content: string) {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  const indexer = new Indexer(shaclDocument);
  const index = indexer.build();
  const builder = new DependencyGraphBuilder(index, shaclDocument);
  return builder.build();
}

function getDependencyKey(dependencies: Map<Term, Set<Term>>, shape: string) {
  return (
    [...dependencies.keys()].find((term) => term.value == shape) ?? DataFactory.namedNode(shape)
  );
}

function getDependentKey(dependents: Map<Term, Set<Term>>, node: string) {
  return [...dependents.keys()].find((term) => term.value == node) ?? DataFactory.namedNode(node);
}

describe('DependencyGraphBuilder', () => {
  describe('build', () => {
    it('should create empty dependency graph for store with no blank nodes', async () => {
      const content = await new StoreBuilder()
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .write();
      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should create dependency graph with single blank node dependency', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .write();

      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(1);

      const parentShapeKey = getDependencyKey(graph.dependencies, parentShape);
      expect(graph.dependencies.has(parentShapeKey)).toBe(true);
      expect(
        [...(graph.dependencies.get(parentShapeKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['b1']);

      expect(graph.dependents.size).toBe(1);

      const b1Key = getDependentKey(graph.dependents, 'b1');
      expect(graph.dependents.get(b1Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
    });

    it('should create dependency graph with multiple blank node dependencies', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .triple(parentShape, SHACL_PROPERTY, 'b2', true)
        .triple(parentShape, SHACL_PROPERTY, 'b3', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .blank('b3', SHACL_PATH, 'http://example.org/email')
        .write();

      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(1);

      const parentShapeKey = getDependencyKey(graph.dependencies, parentShape);

      expect(graph.dependencies.has(parentShapeKey)).toBe(true);

      const deps = graph.dependencies.get(parentShapeKey) ?? new Set();
      expect(deps.size).toBe(3);
      expect([...deps].map((b) => b.value)).toStrictEqual(['b1', 'b2', 'b3']);

      expect(graph.dependents.size).toBe(3);
      const b1Key = getDependentKey(graph.dependents, 'b1');
      const b2Key = getDependentKey(graph.dependents, 'b2');
      const b3Key = getDependentKey(graph.dependents, 'b3');
      expect(graph.dependents.get(b1Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
      expect(graph.dependents.get(b2Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
      expect(graph.dependents.get(b3Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
    });

    it('should handle multiple parent shapes with their own blank node dependencies', async () => {
      const personShape = 'http://example.org/PersonShape';
      const companyShape = 'http://example.org/CompanyShape';
      const content = await new StoreBuilder()
        .triple(personShape, SHACL_PROPERTY, 'b1', true)
        .triple(companyShape, SHACL_PROPERTY, 'b2', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/address')
        .write();
      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(2);

      const personShapeKey = getDependencyKey(graph.dependencies, personShape);
      const companyShapeKey = getDependencyKey(graph.dependencies, companyShape);

      expect(graph.dependencies.has(personShapeKey)).toBe(true);
      expect(graph.dependencies.has(companyShapeKey)).toBe(true);
      expect(
        [...(graph.dependencies.get(personShapeKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['b1']);
      expect(
        [...(graph.dependencies.get(companyShapeKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['b2']);

      expect(graph.dependents.size).toBe(2);
      const b1Key = getDependentKey(graph.dependents, 'b1');
      const b2Key = getDependentKey(graph.dependents, 'b2');
      expect(graph.dependents.get(b1Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(personShape))
      );
      expect(graph.dependents.get(b2Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(companyShape))
      );
    });

    it('should ignore named node objects (not create dependencies)', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .triple(parentShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .write();
      const graph = await getGraph(content);
      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should ignore literal objects (not create dependencies)', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .triple(parentShape, 'http://www.w3.org/ns/shacl#maxCount', '1', false)
        .write();
      const graph = await getGraph(content);
      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });

    it('should handle nested blank nodes (blank node pointing to another blank node)', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .bothBlank('b1', SHACL_NODE_SHAPE, 'b2')
        .blank('b2', SHACL_PATH, 'http://example.org/address')
        .write();

      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(2);

      // Parent shape depends on blankNode1
      const parentShapeKey = getDependencyKey(graph.dependencies, parentShape);
      expect(graph.dependencies.has(parentShapeKey)).toBe(true);
      expect(
        [...(graph.dependencies.get(parentShapeKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['b1']);

      // BlankNode1 depends on blankNode2
      const b1DependencyKey = getDependencyKey(graph.dependencies, 'b1');
      expect(graph.dependencies.has(b1DependencyKey)).toBe(true);
      expect(
        [...(graph.dependencies.get(b1DependencyKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['b2']);

      const b1DependentKey = getDependentKey(graph.dependents, 'b1');
      const b2DependentKey = getDependentKey(graph.dependents, 'b2');
      expect(graph.dependents.size).toBe(2);
      expect(graph.dependents.get(b1DependentKey)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
      expect(graph.dependents.get(b2DependentKey)).toStrictEqual(
        new Set().add(DataFactory.blankNode('b1'))
      );
    });

    it('should handle blank nodes in RDF lists (sh:ignoredProperties)', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .triple(parentShape, SHACL_IGNORED_PROPERTIES, 'l1', true)
        .blank('l1', RDF_FIRST, RDF_TYPE)
        .bothBlank('l1', RDF_REST, 'l2')
        .blank('l2', RDF_FIRST, 'http://example.org/customProp')
        .blank('l2', RDF_REST, RDF_NIL)
        .write();

      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(2);

      // Parent shape depends on first list node
      const parentShapeKey = getDependencyKey(graph.dependencies, parentShape);
      expect(graph.dependencies.has(parentShapeKey)).toBe(true);
      expect(
        [...(graph.dependencies.get(parentShapeKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['l1']);

      // First list node depends on second list node (via rdf:rest)
      const l1DependencyKey = getDependencyKey(graph.dependencies, 'l1');
      expect(graph.dependencies.has(l1DependencyKey)).toBe(true);
      expect(
        [...(graph.dependencies.get(l1DependencyKey) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['l2']);

      const l1DependentKey = getDependentKey(graph.dependents, 'l1');
      const l2DependentKey = getDependentKey(graph.dependents, 'l2');
      expect(graph.dependents.get(l1DependentKey)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
      expect(graph.dependents.get(l2DependentKey)).toStrictEqual(
        new Set().add(DataFactory.blankNode('l1'))
      );
    });

    it('should handle mixed predicates with blank node and non-blank node objects', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .triple(parentShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .literalBool(parentShape, SHACL_CLOSED, true)
        .write();

      const graph = await getGraph(content);

      // Only the blank node should create a dependency
      expect(graph.dependencies.size).toBe(1);
      const parentShapeKey = getDependencyKey(graph.dependencies, parentShape);
      expect(graph.dependencies.has(parentShapeKey)).toBe(true);
      expect(graph.dependencies.get(parentShapeKey)?.size).toBe(1);
      expect(
        [...(graph.dependencies.get(parentShapeKey) ?? new Set<Term>())].map((b) => b.value)
      ).toStrictEqual(['b1']);

      const b1Key = getDependentKey(graph.dependents, 'b1');
      expect(graph.dependents.size).toBe(1);
      expect(graph.dependents.get(b1Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
    });

    it('should throw error when blank node has multiple parents', async () => {
      const shape1 = 'http://example.org/Shape1';
      const shape2 = 'http://example.org/Shape2';
      const content = await new StoreBuilder()
        .triple(shape1, SHACL_PROPERTY, 'b1', true)
        .triple(shape2, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .write();
      const graph = await getGraph(content);

      expect(graph.dependencies.size).toBe(2);
      const shape1Key = getDependencyKey(graph.dependencies, shape1);
      expect(
        [...(graph.dependencies.get(shape1Key) ?? new Set())].map((b) => b.value)
      ).toStrictEqual(['b1']);

      expect(graph.dependents.size).toBe(1);
      const b1Key = getDependentKey(graph.dependents, 'b1');
      expect(graph.dependents.get(b1Key)).toStrictEqual(
        new Set().add(DataFactory.namedNode(shape1)).add(DataFactory.namedNode(shape2))
      );
    });
  });
});
