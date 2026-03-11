import { GraphStore } from '../../src/graph/graph-store';
import { Edge, Node } from '../../src/graph/types';

describe('GraphStore', () => {
  let store: GraphStore;

  beforeEach(() => {
    store = new GraphStore();
  });

  describe('addNode', () => {
    it('should add a node to the store', () => {
      const node: Node = { key: 'root', value: { type: 'object' } };
      store.addNode(node);

      const graph = store.getGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0]).toBe(node);
    });

    it('should add multiple nodes', () => {
      const node1: Node = { key: 'root', value: { type: 'object' } };
      const node2: Node = { key: 'root/type', value: 'object' };
      store.addNode(node1);
      store.addNode(node2);

      const graph = store.getGraph();
      expect(graph.nodes).toHaveLength(2);
    });
  });

  describe('addEdge', () => {
    it('should add an edge to the store', () => {
      const parent: Node = { key: 'root', value: { type: 'object' } };
      const child: Node = { key: 'root/type', value: 'object' };
      const edge: Edge = { from: parent, to: child, label: 'type' };
      store.addEdge(edge);

      const graph = store.getGraph();
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]).toBe(edge);
    });

    it('should add multiple edges', () => {
      const parent: Node = { key: 'root', value: { type: 'object' } };
      const child1: Node = { key: 'root/type', value: 'object' };
      const child2: Node = { key: 'root/title', value: 'Test' };
      const edge1: Edge = { from: parent, to: child1, label: 'type' };
      const edge2: Edge = { from: parent, to: child2, label: 'title' };
      store.addEdge(edge1);
      store.addEdge(edge2);

      const graph = store.getGraph();
      expect(graph.edges).toHaveLength(2);
    });
  });

  describe('getGraph', () => {
    it('should return empty graph initially', () => {
      const graph = store.getGraph();
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('should return graph with all added nodes and edges', () => {
      const node1: Node = { key: 'root', value: { type: 'object' } };
      const node2: Node = { key: 'root/type', value: 'object' };
      const edge: Edge = { from: node1, to: node2, label: 'type' };

      store.addNode(node1);
      store.addNode(node2);
      store.addEdge(edge);

      const graph = store.getGraph();
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
    });
  });
});
