import { ShapesRegistry } from './shapes-registry';
import { ShapeDefinitionBuilder } from '../shape-definition-builder';

describe('Shapes Registry', () => {
  it('should create a shape registry', () => {
    const registry = new ShapesRegistry();
    expect(registry).toBeDefined();
    expect(registry.getOrCreate('test')).toBeInstanceOf(ShapeDefinitionBuilder);
    expect(registry.getOrCreate('test').build().nodeKey).toBe('test');
    registry.getOrCreate('test2');
    expect(registry.getAll().length).toBe(2);
    expect(registry.getShapesDefinitions().length).toBe(2);
  });
});
