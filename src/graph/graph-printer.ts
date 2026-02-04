import { Edge, Graph, Node } from './types';

export class GraphPrinter {
  private adjacencyMap = new Map<string, Edge[]>();

  constructor(private graph: Graph) {
    this.buildAdjacencyMap();
  }

  print(): string {
    const rootNode = this.graph.nodes.find((n) => n.key === 'root');
    if (!rootNode) {
      return '(empty graph)';
    }

    const lines: string[] = [];
    this.printNode(rootNode, '', true, lines);
    return lines.join('\n');
  }

  private buildAdjacencyMap(): void {
    for (const edge of this.graph.edges) {
      const fromKey = edge.from.key;
      if (!this.adjacencyMap.has(fromKey)) {
        this.adjacencyMap.set(fromKey, []);
      }
      this.adjacencyMap.get(fromKey)?.push(edge);
    }
  }

  private printNode(node: Node, prefix: string, isLast: boolean, lines: string[]): void {
    const connector = isLast ? '└── ' : '├── ';
    const nodeLabel = this.formatNodeLabel(node);

    if (prefix === '') {
      lines.push(nodeLabel);
    } else {
      lines.push(prefix + connector + nodeLabel);
    }

    const childEdges = this.adjacencyMap.get(node.key) ?? [];
    const childPrefix = prefix + (prefix === '' ? '' : isLast ? '    ' : '│   ');

    childEdges.forEach((edge, index) => {
      const isLastChild = index === childEdges.length - 1;
      const edgeLabel = this.formatEdgeLabel(edge);
      lines.push(childPrefix + (isLastChild ? '└── ' : '├── ') + edgeLabel);

      const nextPrefix = childPrefix + (isLastChild ? '    ' : '│   ');
      this.printNode(edge.to, nextPrefix, true, lines);
    });
  }

  private formatNodeLabel(node: Node): string {
    const value = node.value;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const type = typeof record.type === 'string' ? record.type : null;
      const title = typeof record.title === 'string' ? record.title : null;
      const ref = typeof record.$ref === 'string' ? record.$ref : null;

      if (ref) return `[${node.key}] $ref: ${ref}`;
      if (title) return `[${node.key}] ${title} (${type ?? 'object'})`;
      if (type) return `[${node.key}] type: ${type}`;
      return `[${node.key}]`;
    }
    return `[${node.key}] = ${JSON.stringify(value)}`;
  }

  private formatEdgeLabel(edge: Edge): string {
    let label = `─(${edge.label})─>`;
    if (edge.propertyKey !== undefined) {
      label = `─(${edge.label}[${edge.propertyKey}])─>`;
    } else if (edge.index !== undefined) {
      label = `─(${edge.label}[${String(edge.index)}])─>`;
    }
    return label;
  }
}

export function printGraph(graph: Graph): string {
  return new GraphPrinter(graph).print();
}
