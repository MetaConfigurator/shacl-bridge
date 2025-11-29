import { ShaclDocument } from '../shacl/model/shacl-document';
import { Store } from 'n3';
import { match, P } from 'ts-pattern';
import logger from '../logger';

// TODO: In U-Schema paper the graph data model has two sets of possible types
// Entity Types and Relationship Types, maybe we can adopt the same here?

interface IdMapping {
  n3Node: string;
  shape: string;
  property: string | null;
}

interface ShapeDefinition {
  nodeKey: string;
  type?: string;
  targetClass?: string;
  description?: string;
  datatype?: string;
  nodeKind?: string;
  minCount?: number;
  maxCount?: number;
  minInclusive?: number;
  maxInclusive?: number;
  minExclusive?: number;
  maxExclusive?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  languageTags?: string[];
  uniqueLang?: boolean;
  equals?: string;
  disjoint?: string;
  lessThan?: string;
  lessThanOrEquals?: string;

  properties?: ShapeDefinition[];
  not?: ShapeDefinition[];
  and?: ShapeDefinition[];
  or?: ShapeDefinition[];
  xone?: ShapeDefinition[];

  closed?: boolean;
  ignoredProperties?: string[];
}

export interface Model {
  shapeDefinitions: ShapeDefinition[];
}

export class ModelBuilder {
  private model: Model = { shapeDefinitions: [] };
  private readonly data: Store;
  private readonly idMappings: Map<string, IdMapping>;
  private shapeDefinitions: Map<string, ShapeDefinition>;
  private readonly prefixes: Map<string, string>;

  constructor(data: ShaclDocument) {
    this.data = data.store;
    this.prefixes = data.prefix;
    this.idMappings = this.createIdMappings();
    this.shapeDefinitions = new Map<string, ShapeDefinition>();
  }

  public get getIdMappings(): Map<string, IdMapping> {
    return this.idMappings;
  }

  build(): Model {
    this.data.getQuads(null, null, null, null).forEach((quad) => {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;
      let shapeDefinition: ShapeDefinition | undefined;

      if (subject.startsWith('n3-')) {
        const idMapping = this.idMappings.has(subject) ? this.idMappings.get(subject) : null;
        if (!idMapping) return;
        const shapeDefinitionIfExists = this.shapeDefinitions
          .get(idMapping.shape)
          ?.properties?.find((shapeDefinition) => shapeDefinition.nodeKey == idMapping.property);
        shapeDefinition = shapeDefinitionIfExists ?? { nodeKey: idMapping.n3Node };
        if (!shapeDefinitionIfExists) {
          const properties = this.shapeDefinitions.get(idMapping.shape)?.properties ?? [];
          properties.push({ nodeKey: predicate, type: object });
        }
      } else {
        shapeDefinition = this.shapeDefinitions.get(subject);
        if (!shapeDefinition) {
          this.shapeDefinitions.set(subject, { nodeKey: subject });
        }
      }

      logger.info(`Processing ${subject} ${predicate} ${object}`);

      if (!shapeDefinition) return;

      match(predicate)
        .with(P.string.endsWith('type'), () => (shapeDefinition.type = object))
        .with(P.string.endsWith('targetClass'), () => (shapeDefinition.targetClass = object))
        .with(P.string.endsWith('closed'), () => (shapeDefinition.closed = object === 'true'))
        .with(P.string.endsWith('ignoredProperties'), () => {
          console.log('TODO');
        })
        .with(P.string.endsWith('maxCount'), () => (shapeDefinition.maxCount = parseInt(object)))
        .with(P.string.endsWith('datatype'), () => (shapeDefinition.datatype = object))
        .with(P.string.endsWith('pattern'), () => (shapeDefinition.pattern = object))
        .with(P.string.endsWith('nodeKind'), () => (shapeDefinition.nodeKind = object))
        .with(P.string.endsWith('property'), () => {
          const idMapping = this.idMappings.get(object);
          if (!idMapping?.property) return;
          shapeDefinition.properties = shapeDefinition.properties ?? [];
          if (!shapeDefinition.properties.find((p) => p.nodeKey === object)) {
            shapeDefinition.properties.push({ nodeKey: idMapping.property });
          }
        });
    });

    this.model.shapeDefinitions = [...this.shapeDefinitions.values()];

    return this.model;
  }

  /*
- We get a list of all n3- nodes
- We find to which shape this n3-nodes belong to
- We find to which property this n3-node belongs to

- In the map we should have <n3-node name, <Tuple<Shape, Property>>>
*/

  private createIdMappings(): Map<string, IdMapping> {
    const idMappings = new Map<string, IdMapping>();

    // Find all n3-* nodes
    const n3Nodes = new Set<string>(
      this.data
        .getQuads(null, null, null, null)
        .map((q) => q.subject.value)
        .filter((s) => s.includes('n3-'))
    );

    // Find which shape is related to which n3-node
    const shapeOfN3Nodes = this.data
      .getQuads(null, null, null, null)
      .filter((q) => [...n3Nodes.keys()].some((node: string) => q.object.value.includes(node)))
      .map((q) => [q.object.value, q.subject.value]);

    //  Find the properties that these n3-nodes represents
    const propertyOfN3Nodes = this.data
      .getQuads(null, null, null, null)
      .filter((q) => [...n3Nodes].some((node) => q.subject.value.includes(node)))
      .filter((q) => q.predicate.value.endsWith('path'))
      .map((q) => [q.subject.value, q.object.value]);

    // Create a single DS to store all the node mappings
    n3Nodes.forEach((n3Node) => {
      const [, shape] = shapeOfN3Nodes.find(([node]) => node === n3Node) ?? [null, null];
      const [, property] = propertyOfN3Nodes.find(([node]) => node === n3Node) ?? [null, null];
      if (shape == null) {
        throw new Error(`Could not find shape or property for n3-node ${n3Node}`);
      }
      // TODO: Need to handle the case when property is null
      idMappings.set(n3Node, {
        n3Node: n3Node,
        shape: shape,
        property: property,
      });
    });

    return idMappings;
  }
}
