import { Edge, Graph, Node } from './types';

export class GraphStore {
  private nodes: Node[] = [];
  private edges: Edge[] = [];

  addNode(node: Node): void {
    this.nodes.push(node);
  }

  addEdge(edge: Edge): void {
    this.edges.push(edge);
  }

  getGraph(): Graph {
    return { nodes: this.nodes, edges: this.edges };
  }
}
