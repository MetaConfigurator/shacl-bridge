import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import { match } from 'ts-pattern';
import { NodeKind } from '../../../../ir/meta-model/node-kind';
import { ConstraintResult } from '../constraint-converter';

export class NodeKindStrategy implements ConstraintStrategy {
  handle(constraints: CoreConstraints, result: ConstraintResult): void {
    const { nodeKind } = constraints;
    if (nodeKind == null) return;
    match(nodeKind)
      .with(NodeKind.IRI, () => {
        result.type = 'string';
        result.format = 'uri';
      })
      .with(NodeKind.LITERAL, () => {
        result['x-shacl-nodeKind'] = 'sh:Literal';
      })
      .with(NodeKind.BLANK_NODE, () => {
        result['x-shacl-nodeKind'] = 'sh:BlankNode';
      })
      .with(NodeKind.BLANK_NODE_OR_IRI, () => {
        result['x-shacl-nodeKind'] = 'sh:BlankNodeOrIRI';
      })
      .with(NodeKind.IRI_OR_LITERAL, () => {
        result['x-shacl-nodeKind'] = 'sh:IRIOrLiteral';
      })
      .with(NodeKind.BLANK_NODE_OR_LITERAL, () => {
        result['x-shacl-nodeKind'] = 'sh:BlankNodeOrLiteral';
      })
      .exhaustive();
  }
}
