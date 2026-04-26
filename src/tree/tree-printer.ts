import { SchemaEdge, SchemaNode } from './types';

export function printGraph(root: SchemaNode): string {
  const lines: string[] = [];
  printNode(root, '', true, lines);
  return lines.join('\n');
}

function printNode(node: SchemaNode, prefix: string, isLast: boolean, lines: string[]): void {
  const connector = prefix === '' ? '' : isLast ? '└── ' : '├── ';
  lines.push(prefix + connector + formatNode(node));

  const childPrefix = prefix + (prefix === '' ? '' : isLast ? '    ' : '│   ');
  node.children.forEach((edge, i) => {
    const isLastChild = i === node.children.length - 1;
    lines.push(childPrefix + (isLastChild ? '└── ' : '├── ') + formatEdge(edge));
    printNode(edge.node, childPrefix + (isLastChild ? '    ' : '│   '), true, lines);
  });
}

function formatNode(node: SchemaNode): string {
  const { schema } = node;
  if (schema.$ref) return `$ref: ${schema.$ref}`;
  if (schema.title) return `${schema.title} (${String(schema.type ?? 'object')})`;
  if (schema.type) return `type: ${String(schema.type)}`;
  return '(schema)';
}

function formatEdge(edge: SchemaEdge): string {
  const key = edge.key ?? '—';
  const index = edge.index !== undefined ? String(edge.index) : '—';
  return `─(label: ${edge.label}, key: ${key}, index: ${index})─>`;
}
