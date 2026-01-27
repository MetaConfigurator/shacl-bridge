import { match, P } from 'ts-pattern';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import { ShapeDefinition } from '../../../ir/meta-model/shape-definition';
import { NodeKind } from '../../../ir/meta-model/node-kind';
import { Condition } from '../../../condition/condition';

export class ConversionContext {
  isArray = false;
  setMinItems = false;
  setMaxItems = false;
  required = false;
  constraints: CoreConstraints;
  isPrimitive: boolean;
  isInvalid = false;

  constructor(
    private readonly shapeDefinition: ShapeDefinition,
    private readonly isLogicalFragment = false
  ) {
    this.constraints = shapeDefinition.coreConstraints ?? {};
    this.isPrimitive = this.hasPrimitiveElements();
    this.isInvalid = this.checkForInvalidNumericConstraint();
    if (!this.isLogicalFragment) {
      this.needToBeArray();
    }
  }

  checkForInvalidNumericConstraint() {
    return new Condition()
      .on(this.constraints)
      .anyOf((c) => c.minCount == null && c.maxCount === 0)
      .anyOf((c) => c.minCount != null && c.maxCount != null && c.maxCount < c.minCount)
      .anyOf((c) => c.minCount === 0 && c.maxCount === 0)
      .anyOf((c) => c.minLength == null && c.maxLength != null && c.maxLength === 0)
      .anyOf((c) => c.minLength != null && c.maxLength != null && c.maxLength < c.minLength)
      .anyOf(
        (c) => c.minInclusive != null && c.maxInclusive != null && c.maxInclusive < c.minInclusive
      )
      .execute();
  }

  hasPrimitiveElements() {
    return new Condition()
      .on(this.constraints)
      .allOf((constraints) => constraints.node == null)
      .allOf((constraints) => constraints.class == null)
      .allOf((constraints) => constraints.qualifiedValueShape == null)
      .anyOf((constraints) => constraints.datatype != null)
      .anyOf((constraints) => constraints.in != null)
      .anyOf((constraints) => constraints.hasValue != null)
      .anyOf(() => this.hasLogicalConstraints())
      .anyOf(() => this.hasStringConstraints())
      .anyOf(() => this.hasPrimitiveNodeKind())
      .execute();
  }

  hasPrimitiveNodeKind() {
    if (this.constraints.nodeKind == null) return false;
    const primitiveNodeKinds = [
      NodeKind.IRI,
      NodeKind.LITERAL,
      NodeKind.IRI_OR_LITERAL,
      NodeKind.BLANK_NODE_OR_IRI,
      NodeKind.BLANK_NODE_OR_LITERAL,
    ];
    return primitiveNodeKinds.includes(this.constraints.nodeKind);
  }

  hasLogicalConstraints() {
    return new Condition()
      .on(this.constraints)
      .anyOf((constraints) => constraints.or != null)
      .anyOf((constraints) => constraints.and != null)
      .anyOf((constraints) => constraints.xone != null)
      .anyOf((constraints) => constraints.not != null)
      .execute();
  }

  hasStringConstraints() {
    return new Condition()
      .on(this.constraints)
      .anyOf((constraints) => constraints.minLength != null)
      .anyOf((constraints) => constraints.maxLength != null)
      .anyOf((constraints) => constraints.pattern != null)
      .execute();
  }

  needToBeArray(): void {
    // Prefer qualified counts if they exist, otherwise use regular counts
    const minCount = this.constraints.qualifiedMinCount ?? this.constraints.minCount;
    const maxCount = this.constraints.qualifiedMaxCount ?? this.constraints.maxCount;
    match([minCount, maxCount])
      // No constraints - distinguish between primitive and object reference
      .with([undefined, undefined], () => {
        // Primitives without constraints → single value
        // Object references without constraints → array (RDF default)
        this.isArray = !this.isPrimitive;
      })
      // Exactly one value required
      .with([1, 1], () => {
        this.isArray = false;
        this.required = true;
      })
      // Zero or one value (optional single value)
      .with([0, 1], () => {
        this.isArray = false;
      })
      .with([undefined, 1], () => {
        // Qualified value shapes are always arrays, even with maxCount 1
        if (this.constraints.qualifiedValueShape != null) {
          this.isArray = true;
          this.setMaxItems = true;
        } else {
          this.isArray = false;
        }
      })
      // At least one value, unbounded max
      .with([1, undefined], () => {
        this.isArray = true;
        this.setMinItems = true;
        this.required = true; // minCount 1 means required
      })
      // Zero or more, with explicit max > 1
      .with([0, P.when((max) => typeof max === 'number' && max > 1)], () => {
        this.isArray = true;
        this.setMinItems = true;
        this.setMaxItems = true;
      })
      .with([undefined, P.when((max) => typeof max === 'number' && max > 1)], () => {
        this.isArray = true;
        this.setMaxItems = true;
      })
      // Multiple values required (min > 1)
      .with([P.when((min) => typeof min === 'number' && min > 1), undefined], () => {
        this.isArray = true;
        this.setMinItems = true;
        this.required = true;
      })
      .with(
        [
          P.when((min) => typeof min === 'number' && min > 1),
          P.when((max) => typeof max === 'number' && max >= (minCount ?? 0)),
        ],
        () => {
          this.isArray = true;
          this.setMinItems = true;
          this.setMaxItems = true;
          this.required = true;
        }
      )
      // Edge case: minCount 1 with maxCount > 1
      .with([1, P.when((max) => typeof max === 'number' && max > 1)], () => {
        this.isArray = true;
        this.setMinItems = true;
        this.setMaxItems = true;
        this.required = true;
      })
      // Invalid constraint: max < min (should probably throw or warn)
      .with(
        [
          P.when((min) => typeof min === 'number' && min > 0),
          P.when((max) => typeof max === 'number' && max > 0),
        ],
        () => {
          if (typeof minCount === 'number' && typeof maxCount === 'number') {
            if (maxCount < minCount) {
              this.isInvalid = true;
            }
            if (maxCount == 0) {
              this.isInvalid = true;
            }
            // Fallback for any other numeric combinations
            this.isArray = maxCount > 1 || minCount > 1;
            this.setMaxItems = true;
            this.setMinItems = true;
            if (minCount > 0) {
              this.required = true;
            }
          }
        }
      )
      .otherwise(() => {
        // Default case for any other combination
        this.isArray = false;
      });
  }
}
