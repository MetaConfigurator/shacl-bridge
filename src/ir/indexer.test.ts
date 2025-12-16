import { DataFactory, Store } from 'n3';
import { Indexer } from './indexer';

// Common RDF and SHACL URIs
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDF_FIRST = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first';
const RDF_REST = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest';
const SHACL_NODE_SHAPE = 'http://www.w3.org/ns/shacl#NodeShape';
const SHACL_PROPERTY_SHAPE = 'http://www.w3.org/ns/shacl#PropertyShape';
const SHACL_PATH = 'http://www.w3.org/ns/shacl#path';
const SHACL_PROPERTY = 'http://www.w3.org/ns/shacl#property';
const SHACL_DATATYPE = 'http://www.w3.org/ns/shacl#datatype';
const SHACL_TARGET_CLASS = 'http://www.w3.org/ns/shacl#targetClass';
const SHACL_NAME = 'http://www.w3.org/ns/shacl#name';
const SHACL_IGNORED_PROPERTIES = 'http://www.w3.org/ns/shacl#ignoredProperties';
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
const FOAF_PERSON = 'http://xmlns.com/foaf/0.1/Person';

class StoreBuilder {
  private store = new Store();

  shape(shapeUri: string, shapeType: string): this {
    this.store.addQuad(
      DataFactory.namedNode(shapeUri),
      DataFactory.namedNode(RDF_TYPE),
      DataFactory.namedNode(shapeType)
    );
    return this;
  }

  triple(subject: string, predicate: string, object: string, isBlank: boolean): this {
    this.store.addQuad(
      DataFactory.namedNode(subject),
      DataFactory.namedNode(predicate),
      isBlank ? DataFactory.blankNode(object) : DataFactory.namedNode(object)
    );
    return this;
  }

  blank(blankNodeId: string, predicate: string, object: string): this {
    this.store.addQuad(
      DataFactory.blankNode(blankNodeId),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(object)
    );
    return this;
  }

  build() {
    return this.store;
  }
}

describe('Indexer', () => {
  describe('build', () => {
    it('should return empty indexes for an empty store', () => {
      const store = new StoreBuilder().build();
      const indexer = new Indexer(store);
      const index = indexer.build();

      expect(index.quadsIndex.size).toBe(0);
      expect(index.blankNodesIndex.size).toBe(0);
      expect(index.namedShapesIndex.size).toBe(0);
    });

    it('should index quads by subject', () => {
      const subject = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .shape(subject, SHACL_NODE_SHAPE)
        .triple(subject, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .build();
      const index = new Indexer(store).build();

      expect(index.quadsIndex.size).toBe(1);
      expect(index.quadsIndex.has(subject)).toBe(true);

      const quads = index.quadsIndex.get(subject);
      expect(quads).toBeDefined();
      expect(quads?.length).toBe(2);
    });

    it('should identify blank nodes in blankNodesIndex', () => {
      const store = new StoreBuilder().blank('b1', SHACL_PATH, 'http://example.org/name').build();
      const index = new Indexer(store).build();

      expect(index.blankNodesIndex.size).toBe(1);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
    });

    it('should identify multiple blank nodes', () => {
      const store = new StoreBuilder()
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .blank('b3', SHACL_DATATYPE, XSD_STRING)
        .build();
      const index = new Indexer(store).build();

      expect(index.blankNodesIndex.size).toBe(3);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
      expect(index.blankNodesIndex.has('b2')).toBe(true);
      expect(index.blankNodesIndex.has('b3')).toBe(true);
    });

    it('should identify named NodeShapes in namedShapesIndex', () => {
      const shapeSubject = 'http://example.org/PersonShape';
      const store = new StoreBuilder().shape(shapeSubject, SHACL_NODE_SHAPE).build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(1);
      expect(index.namedShapesIndex.has(shapeSubject)).toBe(true);
    });

    it('should identify named PropertyShapes in namedShapesIndex', () => {
      const shapeSubject = 'http://example.org/NamePropertyShape';
      const store = new StoreBuilder().shape(shapeSubject, SHACL_PROPERTY_SHAPE).build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(1);
      expect(index.namedShapesIndex.has(shapeSubject)).toBe(true);
    });

    it('should identify multiple named shapes', () => {
      const nodeShape = 'http://example.org/PersonShape';
      const propertyShape = 'http://example.org/NameShape';
      const store = new StoreBuilder()
        .shape(nodeShape, SHACL_NODE_SHAPE)
        .shape(propertyShape, SHACL_PROPERTY_SHAPE)
        .build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(2);
      expect(index.namedShapesIndex.has(nodeShape)).toBe(true);
      expect(index.namedShapesIndex.has(propertyShape)).toBe(true);
    });

    it('should NOT include blank node shapes in namedShapesIndex', () => {
      const store = new StoreBuilder().blank('b1', SHACL_PATH, 'http://example.org/name').build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.blankNodesIndex.size).toBe(1);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
    });

    it('should recognize shape types with different namespace prefixes', () => {
      const shape1 = 'http://example.org/Shape1';
      const shape2 = 'http://example.org/Shape2';
      const store = new StoreBuilder()
        .shape(shape1, SHACL_NODE_SHAPE)
        .shape(shape2, SHACL_PROPERTY_SHAPE)
        .build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(2);
      expect(index.namedShapesIndex.has(shape1)).toBe(true);
      expect(index.namedShapesIndex.has(shape2)).toBe(true);
    });

    it('should handle mixed named nodes and blank nodes', () => {
      const namedShape = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .shape(namedShape, SHACL_NODE_SHAPE)
        .triple(namedShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .build();
      const index = new Indexer(store).build();

      expect(index.quadsIndex.size).toBe(2);
      expect(index.quadsIndex.has(namedShape)).toBe(true);
      expect(index.quadsIndex.has('b1')).toBe(true);

      expect(index.namedShapesIndex.size).toBe(1);
      expect(index.namedShapesIndex.has(namedShape)).toBe(true);

      expect(index.blankNodesIndex.size).toBe(1);
      expect(index.blankNodesIndex.has('b1')).toBe(true);
    });

    it('should index quads from multiple subjects', () => {
      const subject1 = 'http://example.org/Subject1';
      const subject2 = 'http://example.org/Subject2';
      const store = new StoreBuilder()
        .triple(subject1, SHACL_NAME, 'First', false)
        .triple(subject2, SHACL_NAME, 'Second', false)
        .build();
      const index = new Indexer(store).build();

      expect(index.quadsIndex.size).toBe(2);
      expect(index.quadsIndex.has(subject1)).toBe(true);
      expect(index.quadsIndex.has(subject2)).toBe(true);
    });

    it('should NOT identify non-shape types as named shapes', () => {
      const subject = 'http://example.org/Person';
      const store = new StoreBuilder().shape(subject, FOAF_PERSON).build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.quadsIndex.size).toBe(1);
    });

    it('should handle predicates that do not end with "type"', () => {
      const subject = 'http://example.org/PersonShape';
      const store = new StoreBuilder()
        .triple(subject, SHACL_TARGET_CLASS, SHACL_NODE_SHAPE, false)
        .build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.quadsIndex.has(subject)).toBe(true);
    });

    it('should handle objects that do not end with NodeShape or PropertyShape', () => {
      const subject = 'http://example.org/PersonShape';
      const store = new StoreBuilder().shape(subject, 'http://www.w3.org/ns/shacl#Shape').build();
      const index = new Indexer(store).build();

      expect(index.namedShapesIndex.size).toBe(0);
      expect(index.quadsIndex.has(subject)).toBe(true);
    });

    it('should handle complex SHACL document with all types of nodes', () => {
      const personShape = 'http://example.org/PersonShape';
      const companyShape = 'http://example.org/CompanyShape';
      const store = new StoreBuilder()
        .shape(personShape, SHACL_NODE_SHAPE)
        .shape(companyShape, SHACL_PROPERTY_SHAPE)
        .triple(personShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .triple(personShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b1', RDF_TYPE, XSD_STRING)
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .build();

      const index = new Indexer(store).build();

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
      const shape = 'http://example.org/PersonShape';
      const listNode1 = DataFactory.blankNode('l1');
      const listNode2 = DataFactory.blankNode('l2');
      const store = new StoreBuilder()
        .triple(shape, SHACL_IGNORED_PROPERTIES, 'l1', true)
        .blank('l1', RDF_FIRST, RDF_TYPE)
        .blank('l2', RDF_FIRST, 'http://example.org/customProp')
        .build();
      store.addQuad(listNode1, DataFactory.namedNode(RDF_REST), listNode2);
      const index = new Indexer(store).build();

      expect(index.blankNodesIndex.size).toBe(2);
      expect(index.blankNodesIndex.has('l1')).toBe(true);
      expect(index.blankNodesIndex.has('l2')).toBe(true);

      expect(index.quadsIndex.has('l1')).toBe(true);
      expect(index.quadsIndex.has('l2')).toBe(true);
    });
  });
});
