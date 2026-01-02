import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import { match } from 'ts-pattern';
import { NodeKind } from '../../../../ir/meta-model/node-kind';
import { JsonSchema } from '../../../types';

export class NodeKindStrategy implements ConstraintStrategy {
  handle(constraints: CoreConstraints, schema: JsonSchema): void {
    const { nodeKind } = constraints;
    if (nodeKind == null) return;
    match(nodeKind)
      .with(NodeKind.IRI, () => {
        schema.type = 'string';
        schema.format = 'uri';
      })
      .with(NodeKind.LITERAL, () => {
        schema['x-shacl-nodeKind'] = 'sh:Literal';
      })
      .with(NodeKind.BLANK_NODE, () => {
        schema['x-shacl-nodeKind'] = 'sh:BlankNode';
      })
      .with(NodeKind.BLANK_NODE_OR_IRI, () => {
        schema['x-shacl-nodeKind'] = 'sh:BlankNodeOrIRI';
      })
      .with(NodeKind.IRI_OR_LITERAL, () => {
        schema['x-shacl-nodeKind'] = 'sh:IRIOrLiteral';
      })
      .with(NodeKind.BLANK_NODE_OR_LITERAL, () => {
        schema['x-shacl-nodeKind'] = 'sh:BlankNodeOrLiteral';
      })
      .exhaustive();
  }
}
