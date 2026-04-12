import { StoreBuilder } from '../../src';
import { StoreWriter } from '../../src/store/store-writer';
import { SHACL_NODE_SHAPE } from '../../src/shacl/shacl-terms';

const EX = 'http://example.org/';
const prefixes = { ex: EX };

function buildPersonStore() {
  return new StoreBuilder().shape(`${EX}PersonShape`, SHACL_NODE_SHAPE).build();
}

describe('StoreWriter', () => {
  describe('write', () => {
    it('should serialize to Turtle format', async () => {
      const turtle = await new StoreWriter(buildPersonStore(), prefixes).write();

      expect(turtle).toContain('ex:PersonShape');
      expect(turtle).toContain(SHACL_NODE_SHAPE);
    });
  });

  describe('writeJsonLd', () => {
    it('should serialize to JSON-LD format', async () => {
      const jsonLd = await new StoreWriter(buildPersonStore(), prefixes).writeJsonLd();
      const parsed = JSON.parse(jsonLd) as Record<string, unknown>;

      expect(parsed).toBeDefined();
      expect(parsed['@id']).toBe('ex:PersonShape');
    });
  });
});
