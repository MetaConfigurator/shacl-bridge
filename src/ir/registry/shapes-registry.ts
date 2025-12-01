import { ShapeDefinitionBuilder } from '../shape-definition-builder';
import { ShapeDefinition } from '../meta-model/shapeDefinition';

export class ShapesRegistry {
  private readonly shapes = new Map<string, ShapeDefinitionBuilder>();

  getOrCreate(subject: string): ShapeDefinitionBuilder {
    if (!this.shapes.has(subject)) {
      this.shapes.set(subject, new ShapeDefinitionBuilder(subject));
    }
    return this.shapes.get(subject) ?? new ShapeDefinitionBuilder(subject);
  }

  getAll(): ShapeDefinition[] {
    return [...this.shapes.values()].map((sdb) => sdb.build());
  }

  getShapesDefinitions(): ShapeDefinition[] {
    return [...this.shapes]
      .filter(([shape]) => !shape.includes('n3-'))
      .map(([, builder]) => builder.build());
  }
}
