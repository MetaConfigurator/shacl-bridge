import { CycleDetector } from './cycle-detector';
import { DataFactory, Term } from 'n3';

describe('CycleDetector', () => {
  describe('detect', () => {
    it('should return empty map when there are no cycles', () => {
      // a -> b -> c (linear chain, no cycle)
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([c])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(0);
    });

    it('should detect simple 2-node cycle', () => {
      // a -> b -> a
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([a])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(2);
      expect(cycles.has(a)).toBe(true);
      expect(cycles.has(b)).toBe(true);

      const aCycle = cycles.get(a);
      expect(aCycle).toBeDefined();
      expect(aCycle?.size).toBe(2);
      expect([...(aCycle ?? [])].map((n) => n.value).sort()).toEqual(['a', 'b']);

      const bCycle = cycles.get(b);
      expect(bCycle).toBe(aCycle); // Should be the same set object
    });

    it('should detect 3-node cycle', () => {
      // a -> b -> c -> a
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([c])],
        [c, new Set([a])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(3);

      const aCycle = cycles.get(a);
      expect(aCycle).toBeDefined();
      expect(aCycle?.size).toBe(3);
      expect([...(aCycle ?? [])].map((n) => n.value).sort()).toEqual(['a', 'b', 'c']);

      // All nodes should share the same cycle set
      expect(cycles.get(b)).toBe(aCycle);
      expect(cycles.get(c)).toBe(aCycle);
    });

    it('should detect self-loop', () => {
      // a -> a
      const a = DataFactory.blankNode('a');

      const dependencies = new Map<Term, Set<Term>>([[a, new Set([a])]]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(1);
      expect(cycles.has(a)).toBe(true);

      const aCycle = cycles.get(a);
      expect(aCycle).toBeDefined();
      expect(aCycle?.size).toBe(1);
      expect([...(aCycle ?? [])].map((n) => n.value)).toEqual(['a']);
    });

    it('should detect multiple independent cycles', () => {
      // Cycle 1: a -> b -> a
      // Cycle 2: c -> d -> c
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');
      const d = DataFactory.blankNode('d');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([a])],
        [c, new Set([d])],
        [d, new Set([c])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(4);

      const cycle1 = cycles.get(a);
      expect(cycle1).toBeDefined();
      expect(cycle1?.size).toBe(2);
      expect([...(cycle1 ?? [])].map((n) => n.value).sort()).toEqual(['a', 'b']);
      expect(cycles.get(b)).toBe(cycle1);

      const cycle2 = cycles.get(c);
      expect(cycle2).toBeDefined();
      expect(cycle2?.size).toBe(2);
      expect([...(cycle2 ?? [])].map((n) => n.value).sort()).toEqual(['c', 'd']);
      expect(cycles.get(d)).toBe(cycle2);

      // Cycles should be different
      expect(cycle1).not.toBe(cycle2);
    });

    it('should handle cycle with tail (nodes leading into cycle)', () => {
      // x -> y -> a -> b -> c -> a
      // y and x are not in the cycle, only a, b, c
      const x = DataFactory.blankNode('x');
      const y = DataFactory.blankNode('y');
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');

      const dependencies = new Map<Term, Set<Term>>([
        [x, new Set([y])],
        [y, new Set([a])],
        [a, new Set([b])],
        [b, new Set([c])],
        [c, new Set([a])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      // Only a, b, c are in the cycle
      expect(cycles.size).toBe(3);
      expect(cycles.has(a)).toBe(true);
      expect(cycles.has(b)).toBe(true);
      expect(cycles.has(c)).toBe(true);
      expect(cycles.has(x)).toBe(false);
      expect(cycles.has(y)).toBe(false);

      const cycle = cycles.get(a);
      expect(cycle).toBeDefined();
      expect(cycle?.size).toBe(3);
      expect([...(cycle ?? [])].map((n) => n.value).sort()).toEqual(['a', 'b', 'c']);
    });

    it('should handle complex graph with multiple cycles and shared nodes', () => {
      // a -> b -> c -> a (cycle 1)
      // c -> d -> e -> c (cycle 2)
      // c is shared between both cycles
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');
      const d = DataFactory.blankNode('d');
      const e = DataFactory.blankNode('e');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([c])],
        [c, new Set([a, d])], // c points to both a and d
        [d, new Set([e])],
        [e, new Set([c])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      // All 5 nodes form one large strongly connected component
      expect(cycles.size).toBe(5);

      const cycle = cycles.get(a);
      expect(cycle).toBeDefined();
      expect(cycle?.size).toBe(5);
      expect([...(cycle ?? [])].map((n) => n.value).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);

      // All nodes should share the same cycle
      expect(cycles.get(b)).toBe(cycle);
      expect(cycles.get(c)).toBe(cycle);
      expect(cycles.get(d)).toBe(cycle);
      expect(cycles.get(e)).toBe(cycle);
    });

    it('should handle empty dependency graph', () => {
      const dependencies = new Map<Term, Set<Term>>();

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(0);
    });

    it('should handle nodes with no outgoing edges', () => {
      // a -> b, c (isolated)
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [c, new Set()], // c has no dependencies
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(0);
    });

    it('should work with NamedNodes as well as BlankNodes', () => {
      // Test with named nodes (URIs)
      const a = DataFactory.namedNode('http://example.org/a');
      const b = DataFactory.namedNode('http://example.org/b');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([a])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(2);
      expect(cycles.has(a)).toBe(true);
      expect(cycles.has(b)).toBe(true);
    });

    it('should handle diamond pattern without cycle', () => {
      //   a
      //  / \
      // b   c
      //  \ /
      //   d
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');
      const c = DataFactory.blankNode('c');
      const d = DataFactory.blankNode('d');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b, c])],
        [b, new Set([d])],
        [c, new Set([d])],
      ]);

      const detector = new CycleDetector(dependencies);
      const cycles = detector.detect();

      expect(cycles.size).toBe(0);
    });

    it('should be reusable - multiple calls to detect should work', () => {
      const a = DataFactory.blankNode('a');
      const b = DataFactory.blankNode('b');

      const dependencies = new Map<Term, Set<Term>>([
        [a, new Set([b])],
        [b, new Set([a])],
      ]);

      const detector = new CycleDetector(dependencies);

      // First detection
      const cycles1 = detector.detect();
      expect(cycles1.size).toBe(2);

      // Second detection should give same results
      const cycles2 = detector.detect();
      expect(cycles2.size).toBe(2);

      // Should be different map instances
      expect(cycles1).not.toBe(cycles2);
    });
  });
});
