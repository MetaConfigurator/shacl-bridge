import { DataFactory, Store } from 'n3';
import { TopologicalShapeBuilder } from './topological-shape-builder';
import { Indexer } from './indexer';
import { DependencyGraphBuilder } from './dependency-graph';
import { SHAPE_TYPE } from './meta-model/shape';

describe('TopologicalShapeBuilder', () => {
  describe('build', () => {
    it('should build a simple shape with no dependencies', () => {
      const store = new Store();
      const shape = 'http://example.org/PersonShape';

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(shape);
      expect(result[0].shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
      expect(result[0].shape?.targetClass).toBe('http://xmlns.com/foaf/0.1/Person');
      expect(result[0].dependentShapes).toEqual([]);
    });

    it('should build a shape with single blank node dependency', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankProp = DataFactory.blankNode('b1');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankProp
      );

      // Blank node property shape
      store.addQuad(
        blankProp,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/name')
      );
      store.addQuad(
        blankProp,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.nodeKey).toBe('b1');
      expect(result[0].dependentShapes?.[0]?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
      expect(result[0].dependentShapes?.[0]?.shape?.path).toBe('http://xmlns.com/foaf/0.1/name');
      expect(result[0].dependentShapes?.[0]?.coreConstraints?.minCount).toBe(1);
    });

    it('should build a shape with multiple blank node dependencies', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankProp1 = DataFactory.blankNode('b1');
      const blankProp2 = DataFactory.blankNode('b2');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankProp1
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankProp2
      );

      // First blank node
      store.addQuad(
        blankProp1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/name')
      );

      // Second blank node
      store.addQuad(
        blankProp2,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/age')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(2);

      const depKeys = result[0].dependentShapes?.map((d) => d.nodeKey).sort();
      expect(depKeys).toEqual(['b1', 'b2']);
    });

    it('should build nested blank nodes (blank node depending on another blank node)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankNode1 = DataFactory.blankNode('b1');
      const blankNode2 = DataFactory.blankNode('b2');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankNode1
      );

      // First blank node pointing to second blank node
      store.addQuad(
        blankNode1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/address')
      );
      store.addQuad(
        blankNode1,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#qualifiedValueShape'),
        blankNode2
      );

      // Second blank node
      store.addQuad(
        blankNode2,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#datatype'),
        DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#string')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(1);

      // Check first level dependency
      const firstDep = result[0].dependentShapes?.[0];
      expect(firstDep?.nodeKey).toBe('b1');
      expect(firstDep?.shape?.path).toBe('http://example.org/address');

      // Check nested dependency
      expect(firstDep?.dependentShapes).toHaveLength(1);
      expect(firstDep?.dependentShapes?.[0]?.nodeKey).toBe('b2');
      expect(firstDep?.dependentShapes?.[0]?.coreConstraints?.datatype).toBe(
        'http://www.w3.org/2001/XMLSchema#string'
      );
    });

    it('should build multiple independent shapes', () => {
      const store = new Store();
      const shape1 = 'http://example.org/PersonShape';
      const shape2 = 'http://example.org/CompanyShape';

      // First shape
      store.addQuad(
        DataFactory.namedNode(shape1),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape1),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://xmlns.com/foaf/0.1/Person')
      );

      // Second shape
      store.addQuad(
        DataFactory.namedNode(shape2),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape2),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetClass'),
        DataFactory.namedNode('http://example.org/Company')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(2);
      const resultKeys = result.map((r) => r.nodeKey).sort();
      expect(resultKeys).toEqual([shape2, shape1].sort());
    });

    it('should build RDF list structure', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const listNode1 = DataFactory.blankNode('l1');
      const listNode2 = DataFactory.blankNode('l2');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
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
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(1);

      // Check first list node
      const firstListNode = result[0].dependentShapes?.[0];
      expect(firstListNode?.nodeKey).toBe('l1');
      expect(firstListNode?.coreConstraints?.first).toBe(
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      );

      // Check nested list node
      expect(firstListNode?.dependentShapes).toHaveLength(1);
      expect(firstListNode?.dependentShapes?.[0]?.nodeKey).toBe('l2');
      expect(firstListNode?.dependentShapes?.[0]?.coreConstraints?.rest).toBe(
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'
      );
    });

    it('should handle logical constraint shapes (or, and, not, xone)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/IdentifierShape';
      const orConstraint = DataFactory.blankNode('or1');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#or'),
        orConstraint
      );

      // Or constraint blank node
      store.addQuad(
        orConstraint,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].coreConstraints?.or).toEqual(['or1']);
      expect(result[0].dependentShapes).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.nodeKey).toBe('or1');
    });

    it('should automatically set PropertyShape type for blank nodes referenced via sh:property', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankProp = DataFactory.blankNode('b1');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#property'),
        blankProp
      );

      // Blank node WITHOUT explicit type (should be inferred as PropertyShape)
      store.addQuad(
        blankProp,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    });

    it('should handle blank nodes that are not referenced via sh:property (should get default NodeShape type)', () => {
      const store = new Store();
      const parentShape = 'http://example.org/PersonShape';
      const blankNode = DataFactory.blankNode('b1');

      // Parent shape
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(parentShape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#or'),
        blankNode
      );

      // Blank node referenced via 'or', not 'property'
      store.addQuad(
        blankNode,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      // Should default to NodeShape since not referenced via sh:property
      expect(result[0].dependentShapes?.[0]?.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    });

    it('should build all SHACL constraint types', () => {
      const store = new Store();
      const shape = 'http://example.org/ComplexShape';

      // Add shape with all constraint types
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/complexProp')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#maxCount'),
        DataFactory.literal('10', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minLength'),
        DataFactory.literal('3', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#maxLength'),
        DataFactory.literal('50', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#pattern'),
        DataFactory.literal('^[A-Z].*')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#nodeKind'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#IRI')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#class'),
        DataFactory.namedNode('http://example.org/Organization')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#datatype'),
        DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#string')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minInclusive'),
        DataFactory.literal('0', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#maxInclusive'),
        DataFactory.literal(
          '100',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer')
        )
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      const constraints = result[0].coreConstraints;
      expect(constraints?.minCount).toBe(1);
      expect(constraints?.maxCount).toBe(10);
      expect(constraints?.minLength).toBe(3);
      expect(constraints?.maxLength).toBe(50);
      expect(constraints?.pattern).toBe('^[A-Z].*');
      expect(constraints?.class).toBe('http://example.org/Organization');
      expect(constraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');
      expect(constraints?.minInclusive).toBe(0);
      expect(constraints?.maxInclusive).toBe(100);
    });

    it('should handle closed shapes with ignored properties', () => {
      const store = new Store();
      const shape = 'http://example.org/ClosedShape';
      const ignoredList = DataFactory.blankNode('l1');

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#closed'),
        DataFactory.literal(
          'true',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean')
        )
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#ignoredProperties'),
        ignoredList
      );

      store.addQuad(
        ignoredList,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      );
      store.addQuad(
        ignoredList,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.closed).toBe(true);
      expect(result[0].coreConstraints?.ignoredProperties).toEqual(['l1']);
      expect(result[0].dependentShapes).toHaveLength(1);
    });

    it('should handle shapes with severity and deactivation', () => {
      const store = new Store();
      const shape = 'http://example.org/WarningShape';

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/optionalField')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#severity'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#Warning')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#deactivated'),
        DataFactory.literal(
          'true',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean')
        )
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#message'),
        DataFactory.literal('This is deprecated')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].shape?.severity).toBe('sh:Warning');
      expect(result[0].shape?.deactivated).toBe(true);
      expect(result[0].shape?.message).toBe('This is deprecated');
    });

    it('should handle qualified value shapes', () => {
      const store = new Store();
      const shape = 'http://example.org/ScoresShape';
      const qualifiedShape = DataFactory.blankNode('q1');

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/score')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#qualifiedValueShape'),
        qualifiedShape
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#qualifiedMinCount'),
        DataFactory.literal('1', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#qualifiedMaxCount'),
        DataFactory.literal('10', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );

      store.addQuad(
        qualifiedShape,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minInclusive'),
        DataFactory.literal('0', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        qualifiedShape,
        DataFactory.namedNode('http://www.w3.org/ns/shacl#maxInclusive'),
        DataFactory.literal(
          '100',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer')
        )
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.qualifiedValueShape).toBe('q1');
      expect(result[0].coreConstraints?.qualifiedMinCount).toBe(1);
      expect(result[0].coreConstraints?.qualifiedMaxCount).toBe(10);
      expect(result[0].dependentShapes).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.coreConstraints?.minInclusive).toBe(0);
      expect(result[0].dependentShapes?.[0]?.coreConstraints?.maxInclusive).toBe(100);
    });

    it('should handle uniqueLang constraint', () => {
      const store = new Store();
      const shape = 'http://example.org/LabelShape';

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#label')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#uniqueLang'),
        DataFactory.literal(
          'true',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean')
        )
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.uniqueLang).toBe(true);
    });

    it('should handle hasValue constraint', () => {
      const store = new Store();
      const shape = 'http://example.org/DeprecatedShape';

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/isDeprecated')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#hasValue'),
        DataFactory.literal(
          'true',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean')
        )
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.hasValue).toBe(true);
    });

    it('should handle languageIn constraint with blank node list', () => {
      const store = new Store();
      const shape = 'http://example.org/MultilingualShape';
      const langList = DataFactory.blankNode('l1');

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#label')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#languageIn'),
        langList
      );

      store.addQuad(
        langList,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        DataFactory.literal('en')
      );
      store.addQuad(
        langList,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.languageIn).toEqual(['l1']);
      expect(result[0].dependentShapes).toHaveLength(1);
    });

    it('should handle minExclusive and maxExclusive', () => {
      const store = new Store();
      const shape = 'http://example.org/RangeShape';

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://example.org/value')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#minExclusive'),
        DataFactory.literal('0', DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#maxExclusive'),
        DataFactory.literal(
          '100',
          DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer')
        )
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.minExclusive).toBe(0);
      expect(result[0].coreConstraints?.maxExclusive).toBe(100);
    });

    it('should handle in constraint with blank node list', () => {
      const store = new Store();
      const shape = 'http://example.org/CountryCodeShape';
      const inList = DataFactory.blankNode('i1');

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#PropertyShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#path'),
        DataFactory.namedNode('http://schema.org/countryCode')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#in'),
        inList
      );

      store.addQuad(
        inList,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        DataFactory.literal('DE')
      );
      store.addQuad(
        inList,
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.in).toEqual(['i1']);
      expect(result[0].dependentShapes).toHaveLength(1);
    });

    it('should handle targetNode constraint', () => {
      const store = new Store();
      const shape = 'http://example.org/SpecificNodeShape';

      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#NodeShape')
      );
      store.addQuad(
        DataFactory.namedNode(shape),
        DataFactory.namedNode('http://www.w3.org/ns/shacl#targetNode'),
        DataFactory.namedNode('http://example.org/SpecificInstance')
      );

      const indexer = new Indexer(store);
      const index = indexer.build();
      const graphBuilder = new DependencyGraphBuilder(index);
      const graph = graphBuilder.build();
      const builder = new TopologicalShapeBuilder(index, graph);

      const result = builder.build();

      expect(result).toHaveLength(1);
      expect(result[0].shape?.targetNode).toBe('http://example.org/SpecificInstance');
    });
  });
});
