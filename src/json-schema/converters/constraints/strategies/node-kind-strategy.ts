import { CoreConstraints } from '../../../../ir/meta-model/core-constraints';
import { ConstraintStrategy } from '../constraint-strategy';
import { match } from 'ts-pattern';
import { NodeKind } from '../../../../ir/meta-model/node-kind';
import { JsonSchemaObjectType } from '../../../json-schema-type';

export class NodeKindStrategy implements ConstraintStrategy {
  handle(constraints: CoreConstraints, schema: JsonSchemaObjectType): void {
    const { nodeKind } = constraints;
    if (nodeKind == null) return;

    // Skip if there's already a $ref (from sh:class or sh:node)
    // The $ref takes precedence over nodeKind constraints
    const hasRef = schema.$ref != null;

    match(nodeKind)
      .with(NodeKind.IRI, () => {
        if (!hasRef) {
          schema.type = 'string';
          schema.format = 'uri';
        }
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
