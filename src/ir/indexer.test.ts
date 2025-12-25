import { Indexer } from './indexer';
import { StoreBuilder } from '../util/store-builder';
import {
  FOAF_PERSON,
  RDF_FIRST,
  RDF_REST,
  RDF_TYPE,
  SHACL_DATATYPE,
  SHACL_IGNORED_PROPERTIES,
  SHACL_NAME,
  SHACL_NODE_SHAPE,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_PROPERTY_SHAPE,
  SHACL_TARGET_CLASS,
  XSD_STRING,
} from '../util/rdf-terms';
import { ShaclParser } from '../shacl/shacl-parser';
import { DataFactory } from 'n3';

describe('Indexer', () => {
  describe('build', () => {
    it('should return empty indexes for an empty store', async () => {
      const shaclDocument = await new ShaclParser().parse();
      const indexer = new Indexer(shaclDocument);
      const index = indexer.build();

      expect(index.quads.size).toBe(0);
      expect(index.blanks.length).toBe(0);
      expect(index.shapes.length).toBe(0);
    });

    it('should index quads by subject', async () => {
      const subject = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(subject, SHACL_NODE_SHAPE)
        .triple(subject, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .write();

      const shaclDocument = await new ShaclParser().withContent(content).parse();

      const index = new Indexer(shaclDocument).build();

      expect(index.quads.size).toBe(1);
      expect([...index.quads.keys()].map((term) => term.value)).toStrictEqual([subject]);

      const subKey =
        [...index.quads.keys()].find((s) => s.value === subject) ?? DataFactory.namedNode(subject);
      const quads = index.quads.get(subKey);
      expect(quads).toBeDefined();
      expect(quads?.length).toBe(2);
    });

    it('should identify blank nodes in blankNodesIndex', async () => {
      const content = await new StoreBuilder()
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.blanks.length).toBe(1);
      expect(index.blanks.map((b) => b.value)).toContain('b1');
    });

    it('should identify multiple blank nodes', async () => {
      const content = await new StoreBuilder()
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .blank('b3', SHACL_DATATYPE, XSD_STRING)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.blanks.length).toBe(3);
      expect(index.blanks.map((b) => b.value)).toStrictEqual(['b1', 'b2', 'b3']);
    });

    it('should identify named NodeShapes in namedShapesIndex', async () => {
      const shapeSubject = 'http://example.org/PersonShape';
      const content = await new StoreBuilder().shape(shapeSubject, SHACL_NODE_SHAPE).write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.shapes.length).toBe(1);
      expect(index.shapes.map((shape) => shape.value).includes(shapeSubject)).toBe(true);
    });

    it('should identify named PropertyShapes in namedShapesIndex', async () => {
      const shapeSubject = 'http://example.org/NamePropertyShape';
      const content = await new StoreBuilder().shape(shapeSubject, SHACL_PROPERTY_SHAPE).write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.shapes.length).toBe(1);
      expect(index.shapes.map((shape) => shape.value).includes(shapeSubject)).toBe(true);
    });

    it('should identify multiple named shapes', async () => {
      const nodeShape = 'http://example.org/PersonShape';
      const propertyShape = 'http://example.org/NameShape';
      const content = await new StoreBuilder()
        .shape(nodeShape, SHACL_NODE_SHAPE)
        .shape(propertyShape, SHACL_PROPERTY_SHAPE)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.shapes.length).toBe(2);
      expect(index.shapes.map((s) => s.value)).toStrictEqual([nodeShape, propertyShape]);
    });

    it('should NOT include blank node shapes in namedShapesIndex', async () => {
      const content = await new StoreBuilder()
        .blank('b1', SHACL_PATH, 'https://example.org/name')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.shapes.length).toBe(0);
      expect(index.blanks.length).toBe(1);
      expect(index.blanks.map((b) => b.value)).toContain('b1');
    });

    it('should recognize shape types with different namespace prefixes', async () => {
      const shape1 = 'http://example.org/Shape1';
      const shape2 = 'http://example.org/Shape2';
      const content = await new StoreBuilder()
        .shape(shape1, SHACL_NODE_SHAPE)
        .shape(shape2, SHACL_PROPERTY_SHAPE)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.shapes.length).toBe(2);
      expect(index.shapes.map((s) => s.value)).toStrictEqual([shape1, shape2]);
    });

    it('should handle mixed named nodes and blank nodes', async () => {
      const namedShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(namedShape, SHACL_NODE_SHAPE)
        .triple(namedShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.quads.size).toBe(2);
      expect([...index.quads.keys()].map((term) => term.value)).toStrictEqual([namedShape, 'b1']);

      expect(index.shapes.length).toBe(1);
      expect(index.shapes.map((s) => s.value).includes(namedShape)).toBe(true);

      expect(index.blanks.length).toBe(1);
      expect(index.blanks.map((b) => b.value)).toContain('b1');
    });

    it('should index quads from multiple subjects', async () => {
      const subject1 = 'http://example.org/Subject1';
      const subject2 = 'http://example.org/Subject2';
      const content = await new StoreBuilder()
        .triple(subject1, SHACL_NAME, 'First', false)
        .triple(subject2, SHACL_NAME, 'Second', false)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.quads.size).toBe(2);
      expect([...index.quads.keys()].map((term) => term.value)).toStrictEqual([subject1, subject2]);
    });

    it('should handle complex SHACL document with all types of nodes', async () => {
      const personShape = 'http://example.org/PersonShape';
      const companyShape = 'http://example.org/CompanyShape';
      const content = await new StoreBuilder()
        .shape(personShape, SHACL_NODE_SHAPE)
        .shape(companyShape, SHACL_PROPERTY_SHAPE)
        .triple(personShape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .triple(personShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b1', RDF_TYPE, XSD_STRING)
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      // Should have 4 subjects in quads index
      expect(index.quads.size).toBe(4);
      expect([...index.quads.keys()].map((term) => term.value).sort()).toStrictEqual(
        [personShape, companyShape, 'b1', 'b2'].sort()
      );

      // Should have 2 named shapes
      expect(index.shapes.length).toBe(2);
      expect(index.shapes.map((s) => s.value)).toStrictEqual([personShape, companyShape]);

      // Should have 2 blank nodes
      expect(index.blanks.length).toBe(2);
      expect(index.blanks.map((b) => b.value)).toStrictEqual(['b1', 'b2']);
    });

    it('should handle RDF list nodes as blank nodes', async () => {
      const shape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .triple(shape, SHACL_IGNORED_PROPERTIES, 'l1', true)
        .blank('l1', RDF_FIRST, RDF_TYPE)
        .blank('l2', RDF_FIRST, 'http://example.org/customProp')
        .bothBlank('l1', RDF_REST, 'l2')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const index = new Indexer(shaclDocument).build();

      expect(index.blanks.length).toBe(2);
      expect(index.blanks.map((b) => b.value)).toStrictEqual(['l1', 'l2']);

      expect(index.quads.size).toBe(3);
      expect([...index.quads.keys()].map((term) => term.value)).toStrictEqual([shape, 'l1', 'l2']);
    });
  });
});
