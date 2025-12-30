import { ShapeDefinition } from '../ir/meta-model/shape-definition';

/**
 * Detects if a shape is referenced by other shapes.
 * A shape is considered referenced if it appears in:
 * - sh:node
 * - sh:class
 * - sh:property
 * - sh:or, sh:and, sh:not, sh:xone (logical operators)
 * - sh:qualifiedValueShape
 */
export class ReferenceDetector {
  private readonly referencedShapes = new Set<string>();

  constructor(allShapes: ShapeDefinition[]) {
    allShapes.forEach((shape) => {
      this.collectReferencesFromShape(shape);
    });
  }

  isReferenced(nodeKey: string): boolean {
    return this.referencedShapes.has(nodeKey);
  }

  private collectReferencesFromShape(shape: ShapeDefinition): void {
    const constraints = shape.coreConstraints;

    if (constraints) {
      [constraints.node, constraints.class, constraints.qualifiedValueShape]
        .filter((value) => value != null)
        .forEach((value) => this.referencedShapes.add(value));

      [constraints.property, constraints.or, constraints.and, constraints.not, constraints.xone]
        .filter((value) => value != null)
        .flat(1)
        .forEach((value) => this.referencedShapes.add(value));
    }

    shape.dependentShapes?.forEach((dep) => {
      this.referencedShapes.add(dep.nodeKey);
      this.collectReferencesFromShape(dep);
    });
  }
}
