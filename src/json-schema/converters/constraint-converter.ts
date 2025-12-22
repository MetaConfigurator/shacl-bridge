import { match } from 'ts-pattern';
import { CoreConstraints } from '../../ir/meta-model/core-constraints';
import { NodeKind } from '../../ir/meta-model/node-kind';
import { JsonSchema } from '../types';

type ConstraintResult = Pick<
  JsonSchema,
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'type'
  | 'format'
  | 'enum'
  | 'x-shacl-nodeKind'
>;

export class ConstraintConverter {
  /**
   * Converts SHACL CoreConstraints to JSON Schema properties
   * @param constraints The SHACL core constraints
   * @returns JSON Schema constraint properties
   */
  convert(constraints: CoreConstraints | undefined): ConstraintResult {
    if (!constraints) {
      return {};
    }

    const result: ConstraintResult = {};

    // String constraints
    if (constraints.minLength !== undefined) {
      result.minLength = constraints.minLength;
    }
    if (constraints.maxLength !== undefined) {
      result.maxLength = constraints.maxLength;
    }
    if (constraints.pattern !== undefined) {
      result.pattern = constraints.pattern;
    }

    // Numeric constraints
    if (constraints.minInclusive !== undefined) {
      result.minimum = constraints.minInclusive;
    }
    if (constraints.maxInclusive !== undefined) {
      result.maximum = constraints.maxInclusive;
    }
    if (constraints.minExclusive !== undefined) {
      result.exclusiveMinimum = constraints.minExclusive;
    }
    if (constraints.maxExclusive !== undefined) {
      result.exclusiveMaximum = constraints.maxExclusive;
    }

    // NodeKind constraint
    if (constraints.nodeKind !== undefined) {
      this.convertNodeKind(constraints.nodeKind, result);
    }

    // In constraint (enum)
    if (constraints.in && constraints.in.length > 0) {
      result.enum = constraints.in;
    }

    return result;
  }

  private convertNodeKind(nodeKind: NodeKind, result: ConstraintResult): void {
    match(nodeKind)
      .with(NodeKind.IRI, () => {
        result.type = 'string';
        result.format = 'uri';
      })
      .with(NodeKind.LITERAL, () => {
        // Literal can be string, number, or boolean - use extension
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
