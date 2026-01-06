import { match, P } from 'ts-pattern';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import logger from '../../../logger';
import { ShapeDefinition } from '../../../ir/meta-model/shape-definition';
import { NodeKind } from '../../../ir/meta-model/node-kind';

export class ConversionContext {
  isArray = false;
  setMinItems = false;
  setMaxItems = false;
  required = false;
  constraints: CoreConstraints;
  private isPrimitive: boolean;

  constructor(
    private readonly shapeDefinition: ShapeDefinition,
    private readonly isLogicalFragment = false
  ) {
    this.constraints = shapeDefinition.coreConstraints ?? {};
    this.isPrimitive = this.hasPrimitiveElements();
    if (!this.isLogicalFragment) {
      this.needToBeArray();
    }
  }

  hasPrimitiveElements() {
    return (
      (this.constraints.datatype != null ||
        this.constraints.in != null ||
        this.hasLogicalConstraints() ||
        this.hasStringConstraints() ||
        this.hasPrimitiveNodeKind()) &&
      this.constraints.node == null &&
      this.constraints.class == null &&
      this.constraints.qualifiedValueShape == null
    );
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
    return (
      this.constraints.or != null ||
      this.constraints.and != null ||
      this.constraints.xone != null ||
      this.constraints.not != null
    );
  }

  hasStringConstraints() {
    return (
      this.constraints.minLength != null ||
      this.constraints.maxLength != null ||
      this.constraints.pattern != null
    );
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
              logger.error('minCount should be less than maxCount');
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
