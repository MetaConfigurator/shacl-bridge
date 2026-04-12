import { DependencyGraphBuilder } from '../../src/ir/dependency-graph';
import { Indexer } from '../../src/ir/indexer';
import { StoreBuilder } from '../../src';
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
      const deps = [...(graph.dependencies.get(parentShapeKey) ?? new Set())];
      expect(deps).toHaveLength(1);
      const blankId = deps[0].value;

      expect(graph.dependents.size).toBe(1);

      const blankKey = getDependentKey(graph.dependents, blankId);
      expect(graph.dependents.get(blankKey)).toStrictEqual(
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

      expect(graph.dependents.size).toBe(3);
      for (const dep of deps) {
        const depKey = getDependentKey(graph.dependents, dep.value);
        expect(graph.dependents.get(depKey)).toStrictEqual(
          new Set().add(DataFactory.namedNode(parentShape))
        );
      }
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
      const personDeps = [...(graph.dependencies.get(personShapeKey) ?? new Set())];
      const companyDeps = [...(graph.dependencies.get(companyShapeKey) ?? new Set())];
      expect(personDeps).toHaveLength(1);
      expect(companyDeps).toHaveLength(1);
      const personBlankId = personDeps[0].value;
      const companyBlankId = companyDeps[0].value;

      expect(graph.dependents.size).toBe(2);
      const personBlankKey = getDependentKey(graph.dependents, personBlankId);
      const companyBlankKey = getDependentKey(graph.dependents, companyBlankId);
      expect(graph.dependents.get(personBlankKey)).toStrictEqual(
        new Set().add(DataFactory.namedNode(personShape))
      );
      expect(graph.dependents.get(companyBlankKey)).toStrictEqual(
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
      const parentDeps = [...(graph.dependencies.get(parentShapeKey) ?? new Set())];
      expect(parentDeps).toHaveLength(1);
      const b1Id = parentDeps[0].value;

      // BlankNode1 depends on blankNode2
      const b1DependencyKey = getDependencyKey(graph.dependencies, b1Id);
      expect(graph.dependencies.has(b1DependencyKey)).toBe(true);
      const b1Deps = [...(graph.dependencies.get(b1DependencyKey) ?? new Set())];
      expect(b1Deps).toHaveLength(1);
      const b2Id = b1Deps[0].value;

      const b1DependentKey = getDependentKey(graph.dependents, b1Id);
      const b2DependentKey = getDependentKey(graph.dependents, b2Id);
      expect(graph.dependents.size).toBe(2);
      expect(graph.dependents.get(b1DependentKey)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
      expect(graph.dependents.get(b2DependentKey)).toStrictEqual(
        new Set().add(DataFactory.blankNode(b1Id))
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
      const listHeadDeps = [...(graph.dependencies.get(parentShapeKey) ?? new Set())];
      expect(listHeadDeps).toHaveLength(1);
      const listHeadId = listHeadDeps[0].value;

      // First list node depends on second list node (via rdf:rest)
      const listHeadKey = getDependencyKey(graph.dependencies, listHeadId);
      expect(graph.dependencies.has(listHeadKey)).toBe(true);
      const listTailDeps = [...(graph.dependencies.get(listHeadKey) ?? new Set())];
      expect(listTailDeps).toHaveLength(1);
      const listTailId = listTailDeps[0].value;

      const listHeadDependentKey = getDependentKey(graph.dependents, listHeadId);
      const listTailDependentKey = getDependentKey(graph.dependents, listTailId);
      expect(graph.dependents.get(listHeadDependentKey)).toStrictEqual(
        new Set().add(DataFactory.namedNode(parentShape))
      );
      expect(graph.dependents.get(listTailDependentKey)).toStrictEqual(
        new Set().add(DataFactory.blankNode(listHeadId))
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
      const mixedDeps = [...(graph.dependencies.get(parentShapeKey) ?? new Set<Term>())];
      expect(mixedDeps).toHaveLength(1);
      const blankId = mixedDeps[0].value;

      const blankKey = getDependentKey(graph.dependents, blankId);
      expect(graph.dependents.size).toBe(1);
      expect(graph.dependents.get(blankKey)).toStrictEqual(
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
