import { WriterContext } from './writer-context';

const EX = 'http://example.org/';

describe('WriterContext', () => {
  describe('baseUri extraction', () => {
    it('should extract base URI from $id with path', () => {
      const context = new WriterContext({ $id: 'http://example.org/shapes/Person' });

      expect(context.baseUri).toBe('http://example.org/shapes/');
    });

    it('should extract base URI from $id with hash', () => {
      const context = new WriterContext({ $id: 'http://example.org/schema#Person' });

      expect(context.baseUri).toBe('http://example.org/schema#');
    });

    it('should use default base URI when $id is not provided', () => {
      const context = new WriterContext({});

      expect(context.baseUri).toBe(EX);
    });

    it('should use default base URI when $id has no path separator', () => {
      const context = new WriterContext({ $id: 'Person' });

      expect(context.baseUri).toBe(EX);
    });
  });

  describe('shapeUri', () => {
    it('should use $id as shape URI when provided', () => {
      const context = new WriterContext({ $id: 'http://example.org/PersonShape' });

      expect(context.shapeUri).toBe('http://example.org/PersonShape');
    });

    it('should generate default shape URI when $id is not provided', () => {
      const context = new WriterContext({});

      expect(context.shapeUri).toBe(`${EX}Shape`);
    });
  });

  describe('resolveRef', () => {
    it('should resolve $defs reference to full URI', () => {
      const context = new WriterContext({ $id: 'http://example.org/Root' });

      expect(context.resolveRef('#/$defs/Person')).toBe('http://example.org/Person');
    });

    it('should return external reference unchanged', () => {
      const context = new WriterContext({ $id: 'http://example.org/Root' });

      expect(context.resolveRef('http://other.org/Shape')).toBe('http://other.org/Shape');
    });

    it('should use default base for $defs resolution when no $id', () => {
      const context = new WriterContext({});

      expect(context.resolveRef('#/$defs/Person')).toBe(`${EX}Person`);
    });
  });

  describe('nextBlankId', () => {
    it('should generate sequential blank node IDs', () => {
      const context = new WriterContext({});

      expect(context.nextBlankId()).toBe('b0');
      expect(context.nextBlankId()).toBe('b1');
      expect(context.nextBlankId()).toBe('b2');
    });
  });

  describe('buildPropertyUri', () => {
    it('should build property URI from base and property name', () => {
      const context = new WriterContext({ $id: 'http://example.org/Shape' });

      expect(context.buildPropertyUri('name')).toBe('http://example.org/name');
    });
  });

  describe('buildDefUri', () => {
    it('should build definition URI from base and def name', () => {
      const context = new WriterContext({ $id: 'http://example.org/Root' });

      expect(context.buildDefUri('Person')).toBe('http://example.org/Person');
    });
  });

  describe('storeBuilder', () => {
    it('should provide access to store builder', () => {
      const context = new WriterContext({});

      expect(context.store).toBeDefined();
    });
  });
});
