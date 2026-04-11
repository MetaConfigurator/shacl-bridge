import { Edge, Node } from '../../../graph/types';

export type ProcessFn = (
  node: Node,
  subject: string,
  isBlank?: boolean,
  targetClass?: string
) => void;

export interface EdgeProcessor {
  process(edges: Edge[], subject: string, isBlank: boolean): void;
}
