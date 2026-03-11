import { Indexer } from '../../src/ir/indexer';
import { StoreBuilder } from '../../src/store/store-builder';
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
} from '../../src/shacl/shacl-terms';
import { ShaclParser } from '../../src/shacl/parser/shacl-parser';
import { DataFactory, Quad_Subject } from 'n3';

function getKey(shapes: Quad_Subject[], search: string) {
  return [...shapes].filter((shape) => shape.value.endsWith(search));
}

describe('Indexer', () => {
  describe('build', () => {
    it('should return empty indexes for an empty store', async () => {
      const shaclDocument = await new ShaclParser().parse();
      const indexer = new Indexer(shaclDocument);
      const { shapes, blanks, quads, targets } = indexer.build();

      expect(quads.size).toBe(0);
      expect(blanks.length).toBe(0);
      expect(shapes.length).toBe(0);
      expect(targets.size).toBe(0);
    });

    it('should index quads by subject', async () => {
      const subject = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(subject, SHACL_NODE_SHAPE)
        .triple(subject, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .write();

      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(1);
      expect([...quads.keys()].map((term) => term.value)).toStrictEqual([subject]);

      const subKey =
        [...quads.keys()].find((s) => s.value === subject) ?? DataFactory.namedNode(subject);
      const quadsForPersonShape = quads.get(subKey);
      expect(quadsForPersonShape).toBeDefined();
      expect(quadsForPersonShape?.length).toBe(2);

      expect(blanks.length).toBe(0);
      expect(shapes.length).toBe(1);
      expect(shapes.map((shape) => shape.value)).toContain(subject);
      const key = getKey(shapes, 'PersonShape')[0];
      expect(targets.get(key)).toEqual(['Person']);
    });

    it('should identify blank nodes in blankNodesIndex', async () => {
      const content = await new StoreBuilder()
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(1);
      expect(blanks.length).toBe(1);
      expect(blanks.map((b) => b.value)).toContain('b1');
      expect(targets.size).toBe(1);
      expect(shapes.length).toBe(0);
    });

    it('should identify multiple blank nodes', async () => {
      const content = await new StoreBuilder()
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .blank('b2', SHACL_PATH, 'http://example.org/age')
        .blank('b3', SHACL_DATATYPE, XSD_STRING)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(3);
      expect(blanks.length).toBe(3);
      expect(blanks.map((b) => b.value)).toStrictEqual(['b1', 'b2', 'b3']);
      expect(targets.size).toBe(3);
      expect(shapes.length).toBe(0);
    });

    it('should identify named NodeShapes in namedShapesIndex', async () => {
      const shapeSubject = 'http://example.org/PersonShape';
      const content = await new StoreBuilder().shape(shapeSubject, SHACL_NODE_SHAPE).write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(1);
      expect(shapes.length).toBe(1);
      expect(shapes.map((shape) => shape.value).includes(shapeSubject)).toBe(true);
      expect(blanks.length).toBe(0);
      expect(targets.size).toBe(1);
      expect(targets.get(getKey(shapes, 'PersonShape')[0])).toEqual(['Person']);
    });

    it('should identify named PropertyShapes in namedShapesIndex', async () => {
      const shapeSubject = 'http://example.org/NamePropertyShape';
      const content = await new StoreBuilder().shape(shapeSubject, SHACL_PROPERTY_SHAPE).write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(1);
      expect(blanks.length).toBe(0);
      expect(shapes.length).toBe(1);
      expect(shapes.map((shape) => shape.value).includes(shapeSubject)).toBe(true);
      expect(targets.size).toBe(1);
      expect(targets.get(getKey(shapes, 'NamePropertyShape')[0])).toEqual(['NameProperty']);
    });

    it('should identify multiple named shapes', async () => {
      const nodeShape = 'http://example.org/PersonShape';
      const propertyShape = 'http://example.org/NameShape';
      const content = await new StoreBuilder()
        .shape(nodeShape, SHACL_NODE_SHAPE)
        .shape(propertyShape, SHACL_PROPERTY_SHAPE)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(2);
      expect(shapes.length).toBe(2);
      expect(shapes.map((s) => s.value)).toStrictEqual([nodeShape, propertyShape]);
      expect(blanks.length).toBe(0);
      expect(targets.size).toBe(2);
      expect(targets.get(getKey(shapes, 'PersonShape')[0])).toEqual(['Person']);
      expect(targets.get(getKey(shapes, 'NameShape')[0])).toEqual(['Name']);
    });

    it('should NOT include blank node shapes in namedShapesIndex', async () => {
      const content = await new StoreBuilder()
        .blank('b1', SHACL_PATH, 'https://example.org/name')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(1);
      expect(shapes.length).toBe(0);
      expect(blanks.length).toBe(1);
      expect(blanks.map((b) => b.value)).toContain('b1');
      expect(targets.size).toBe(1);
    });

    it('should recognize shape types with different namespace prefixes', async () => {
      const shape1 = 'http://example.org/Shape1';
      const shape2 = 'http://example.org/Shape2';
      const content = await new StoreBuilder()
        .shape(shape1, SHACL_NODE_SHAPE)
        .shape(shape2, SHACL_PROPERTY_SHAPE)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(2);
      expect(blanks.length).toBe(0);
      expect(shapes.length).toBe(2);
      expect(shapes.map((s) => s.value)).toStrictEqual([shape1, shape2]);
      expect(targets.size).toBe(2);
      expect(targets.get(getKey(shapes, 'Shape1')[0])).toEqual(['Shape1']);
      expect(targets.get(getKey(shapes, 'Shape2')[0])).toEqual(['Shape2']);
    });

    it('should handle mixed named nodes and blank nodes', async () => {
      const namedShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(namedShape, SHACL_NODE_SHAPE)
        .triple(namedShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/name')
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(2);
      expect([...quads.keys()].map((term) => term.value)).toStrictEqual([namedShape, 'b1']);
      expect(shapes.length).toBe(1);
      expect(shapes.map((s) => s.value).includes(namedShape)).toBe(true);
      expect(blanks.length).toBe(1);
      expect(blanks.map((b) => b.value)).toContain('b1');
      expect(targets.size).toBe(2);
      expect(targets.get(getKey(shapes, 'PersonShape')[0])).toEqual(['Person']);
    });

    it('should index quads from multiple subjects', async () => {
      const subject1 = 'http://example.org/Subject1';
      const subject2 = 'http://example.org/Subject2';
      const content = await new StoreBuilder()
        .triple(subject1, SHACL_NAME, 'First', false)
        .triple(subject2, SHACL_NAME, 'Second', false)
        .write();
      const shaclDocument = await new ShaclParser().withContent(content).parse();
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(2);
      expect([...quads.keys()].map((term) => term.value)).toStrictEqual([subject1, subject2]);
      expect(shapes.length).toBe(2);
      expect(shapes.map((s) => s.value)).toStrictEqual([subject1, subject2]);
      expect(blanks.length).toBe(0);
      expect(targets.size).toBe(2);
      expect(targets.get(getKey(shapes, 'Subject1')[0])).toEqual(['Subject1']);
      expect(targets.get(getKey(shapes, 'Subject2')[0])).toEqual(['Subject2']);
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
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(quads.size).toBe(4);
      expect([...quads.keys()].map((term) => term.value).sort()).toStrictEqual(
        [personShape, companyShape, 'b1', 'b2'].sort()
      );
      expect(shapes.length).toBe(2);
      expect(shapes.map((s) => s.value)).toStrictEqual([personShape, companyShape]);
      expect(blanks.length).toBe(2);
      expect(blanks.map((b) => b.value)).toStrictEqual(['b1', 'b2']);
      expect(targets.size).toBe(4);
      expect(targets.get(getKey(shapes, 'PersonShape')[0])).toEqual(['Person']);
      expect(targets.get(getKey(shapes, 'CompanyShape')[0])).toEqual(['Company']);
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
      const { quads, blanks, shapes, targets } = new Indexer(shaclDocument).build();

      expect(blanks.length).toBe(2);
      expect(blanks.map((b) => b.value)).toStrictEqual(['l1', 'l2']);
      expect(quads.size).toBe(3);
      expect([...quads.keys()].map((term) => term.value)).toStrictEqual([shape, 'l1', 'l2']);
      expect(shapes.length).toBe(1);
      expect(shapes.map((s) => s.value)).toStrictEqual([shape]);
      expect(targets.size).toBe(3);
      expect(targets.get(getKey(shapes, 'PersonShape')[0])).toEqual(['Person']);
    });
  });
});
