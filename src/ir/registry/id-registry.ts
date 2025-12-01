import { IdMapping } from '../meta-model/idMapping';
import { Store } from 'n3';

export class IdRegistry {
  private readonly idMapping = new Map<string, IdMapping>();

  /*
- We get a list of all n3- nodes
- We find to which shape this n3-nodes belong to
- We find to which property this n3-node belongs to

- In the map we should have <n3-node name, <Tuple<Shape, Property>>>
*/
  constructor(store: Store) {
    const quads = store.getQuads(null, null, null, null);

    const n3Nodes = new Set(quads.map((q) => q.subject.value).filter((s) => s.includes('n3-')));

    const shapeOf = new Map<string, string>();
    const propertyOf = new Map<string, string>();

    for (const q of quads) {
      const subject = q.subject.value;
      const predicate = q.predicate.value;
      const object = q.object.value;

      // n3 node as object → tells us the shape
      if (n3Nodes.has(object)) {
        shapeOf.set(object, subject);
      }

      // n3 node as subject + sh:path → tells us the property
      if (n3Nodes.has(subject) && predicate.endsWith('path')) {
        propertyOf.set(subject, object);
      }
    }

    for (const n3Node of n3Nodes) {
      const shape = shapeOf.get(n3Node);
      const property = propertyOf.get(n3Node) ?? null;

      if (!shape) {
        throw new Error(`Could not find shape for n3-node ${n3Node}`);
      }

      this.idMapping.set(n3Node, {
        n3Node,
        shape,
        property,
      });
    }
  }

  getIdMapping(n3Node: string) {
    return this.idMapping.get(n3Node);
  }
}
