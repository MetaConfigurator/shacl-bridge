import { DataFactory } from 'n3';
import { StoreBuilder } from '../../src';
import {
  RDF_FIRST,
  RDF_NIL,
  RDF_REST,
  RDF_TYPE,
  SHACL_NODE_SHAPE,
  SHACL_PATH,
  XSD_INTEGER,
} from '../../src/shacl/shacl-terms';

describe('StoreBuilder', () => {
  let builder: StoreBuilder;

  beforeEach(() => {
    builder = new StoreBuilder();
  });

  describe('shape', () => {
    it('should add a shape quad with rdf:type', () => {
      const store = builder.shape('http://example.org/PersonShape', SHACL_NODE_SHAPE).build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/PersonShape'),
        DataFactory.namedNode(RDF_TYPE),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe(SHACL_NODE_SHAPE);
    });
  });

  describe('triple', () => {
    it('should add a triple with named node object', () => {
      const store = builder
        .triple('http://example.org/PersonShape', SHACL_PATH, 'http://example.org/name', false)
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/PersonShape'),
        DataFactory.namedNode(SHACL_PATH),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.termType).toBe('NamedNode');
      expect(quads[0].object.value).toBe('http://example.org/name');
    });

    it('should add a triple with blank node object', () => {
      const store = builder
        .triple('http://example.org/PersonShape', SHACL_PATH, 'b1', true)
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/PersonShape'),
        DataFactory.namedNode(SHACL_PATH),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.termType).toBe('BlankNode');
    });
  });

  describe('blank', () => {
    it('should add a quad with blank node subject and named node object', () => {
      const store = builder.blank('b1', RDF_TYPE, SHACL_NODE_SHAPE).build();

      const quads = store.getQuads(null, DataFactory.namedNode(RDF_TYPE), null, null);

      expect(quads).toHaveLength(1);
      expect(quads[0].subject.termType).toBe('BlankNode');
      expect(quads[0].object.value).toBe(SHACL_NODE_SHAPE);
    });
  });

  describe('bothBlank', () => {
    it('should add a quad with blank node subject and blank node object', () => {
      const store = builder.bothBlank('b1', SHACL_PATH, 'b2').build();

      const quads = store.getQuads(null, DataFactory.namedNode(SHACL_PATH), null, null);

      expect(quads).toHaveLength(1);
      expect(quads[0].subject.termType).toBe('BlankNode');
      expect(quads[0].object.termType).toBe('BlankNode');
    });
  });

  describe('literalInt', () => {
    it('should add an integer literal with named subject', () => {
      const store = builder
        .literalInt('http://example.org/Shape', 'http://example.org/count', 42)
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/count'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.termType).toBe('Literal');
      expect(quads[0].object.value).toBe('42');
    });

    it('should add an integer literal with blank subject', () => {
      const store = builder.literalInt('b1', 'http://example.org/count', 42, true).build();

      const quads = store.getQuads(
        null,
        DataFactory.namedNode('http://example.org/count'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].subject.termType).toBe('BlankNode');
    });
  });

  describe('literalBool', () => {
    it('should add a boolean literal', () => {
      const store = builder
        .literalBool('http://example.org/Shape', 'http://example.org/active', true)
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/active'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe('true');
    });
  });

  describe('literalString', () => {
    it('should add a string literal', () => {
      const store = builder
        .literalString('http://example.org/Shape', 'http://example.org/name', 'Test')
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/name'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.termType).toBe('Literal');
      expect(quads[0].object.value).toBe('Test');
    });
  });

  describe('literal', () => {
    it('should add a literal with custom datatype', () => {
      const store = builder
        .literal('http://example.org/Shape', 'http://example.org/value', '100', XSD_INTEGER)
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/value'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe('100');
    });
  });

  describe('list', () => {
    it('should create an empty list pointing to rdf:nil', () => {
      const store = builder
        .list('http://example.org/Shape', 'http://example.org/items', [])
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/items'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe(RDF_NIL);
    });

    it('should create a list with literal items', () => {
      const store = builder
        .list('http://example.org/Shape', 'http://example.org/items', ['a', 'b', 'c'])
        .build();

      const firstQuads = store.getQuads(null, DataFactory.namedNode(RDF_FIRST), null, null);
      expect(firstQuads).toHaveLength(3);

      const values = firstQuads.map((q) => q.object.value);
      expect(values).toContain('a');
      expect(values).toContain('b');
      expect(values).toContain('c');
    });

    it('should create a list with URI items', () => {
      const store = builder
        .list(
          'http://example.org/Shape',
          'http://example.org/items',
          ['http://example.org/a', 'http://example.org/b'],
          false,
          true
        )
        .build();

      const firstQuads = store.getQuads(null, DataFactory.namedNode(RDF_FIRST), null, null);
      expect(firstQuads).toHaveLength(2);
      expect(firstQuads[0].object.termType).toBe('NamedNode');
    });

    it('should produce distinct list nodes for different predicates on the same subject', () => {
      const store = builder
        .list('http://example.org/Shape', 'http://example.org/predA', ['a', 'b'], false, true)
        .list('http://example.org/Shape', 'http://example.org/predB', ['c', 'd'], false, true)
        .build();

      const headA = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/predA'),
        null,
        null
      )[0].object;

      const headB = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/predB'),
        null,
        null
      )[0].object;

      expect(headA.value).not.toBe(headB.value);
    });

    it('should create proper rdf:rest chain ending in rdf:nil', () => {
      const store = builder
        .list('http://example.org/Shape', 'http://example.org/items', ['a', 'b'])
        .build();

      const restQuads = store.getQuads(null, DataFactory.namedNode(RDF_REST), null, null);
      expect(restQuads).toHaveLength(2);

      const nilQuad = restQuads.find((q) => q.object.value === RDF_NIL);
      expect(nilQuad).toBeDefined();
    });
  });

  describe('listOfBlanks', () => {
    it('should create a list of blank nodes', () => {
      const store = builder
        .listOfBlanks('http://example.org/Shape', 'http://example.org/items', ['b1', 'b2'])
        .build();

      const firstQuads = store.getQuads(null, DataFactory.namedNode(RDF_FIRST), null, null);
      expect(firstQuads).toHaveLength(2);
      expect(firstQuads[0].object.termType).toBe('BlankNode');
      expect(firstQuads[1].object.termType).toBe('BlankNode');
    });

    it('should create an empty list for empty blankIds', () => {
      const store = builder
        .listOfBlanks('http://example.org/Shape', 'http://example.org/items', [])
        .build();

      const quads = store.getQuads(
        DataFactory.namedNode('http://example.org/Shape'),
        DataFactory.namedNode('http://example.org/items'),
        null,
        null
      );

      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe(RDF_NIL);
    });
  });

  describe('withPrefixes', () => {
    it('should merge prefixes', () => {
      builder.withPrefixes({ sh: 'http://www.w3.org/ns/shacl#' });
      builder.withPrefixes({ xsd: 'http://www.w3.org/2001/XMLSchema#' });

      builder.shape('http://example.org/Shape', SHACL_NODE_SHAPE);
      const store = builder.build();

      expect(store.size).toBe(1);
    });
  });

  describe('write', () => {
    it('should serialize to Turtle format', async () => {
      builder
        .withPrefixes({ ex: 'http://example.org/' })
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE);

      const turtle = await builder.write();

      expect(turtle).toContain('ex:PersonShape');
      expect(turtle).toContain(SHACL_NODE_SHAPE);
    });
  });

  describe('writeJsonLd', () => {
    it('should serialize to JSON-LD format', async () => {
      builder
        .withPrefixes({ ex: 'http://example.org/' })
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE);

      const jsonLd = await builder.writeJsonLd();
      const parsed = JSON.parse(jsonLd) as Record<string, unknown>;

      expect(parsed).toBeDefined();
      expect(parsed['@id']).toBe('ex:PersonShape');
    });
  });

  describe('fluent API', () => {
    it('should support method chaining', () => {
      const store = builder
        .withPrefixes({ ex: 'http://example.org/' })
        .shape('http://example.org/PersonShape', SHACL_NODE_SHAPE)
        .literalString('http://example.org/PersonShape', 'http://example.org/name', 'Person')
        .literalInt('http://example.org/PersonShape', 'http://example.org/minCount', 1)
        .build();

      expect(store.size).toBe(3);
    });
  });
});
