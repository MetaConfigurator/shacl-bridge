import { ShaclDocument } from '../shacl/model/shacl-document';
import { Store } from 'n3';
import { ShapeDefinition } from './meta-model/shapeDefinition';
import logger from '../logger';
import { match, P } from 'ts-pattern';
import { ShapesRegistry } from './registry/shapes-registry';
import { IdRegistry } from './registry/id-registry';
import { Model } from './meta-model/model';

export class ModelBuilder {
  private model: Model = { shapeDefinitions: [] };
  private readonly data: Store;
  private readonly idRegistry;
  private readonly prefixes: Map<string, string>;
  private readonly shapesRegistry: ShapesRegistry = new ShapesRegistry();

  constructor(data: ShaclDocument) {
    this.data = data.store;
    this.prefixes = data.prefix;
    this.idRegistry = new IdRegistry(this.data);
  }

  public get shapeDefinitions(): ShapeDefinition[] {
    return this.shapesRegistry.getShapesDefinitions();
  }

  build(): Model {
    this.data.getQuads(null, null, null, null).forEach((quad) => {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      const builder = this.shapesRegistry.getOrCreate(subject);

      // For NodeShape and PropertyShape
      builder.setType(object);

      // For sh:property
      builder.setType(predicate);

      // Pattern Matching for the shape properties
      match(predicate)
        .with(P.string.endsWith('path'), () => builder.setPath(object))
        .with(P.string.endsWith('targetClass'), () => builder.setTargetClass(object))
        .with(P.string.endsWith('deactivated'), () => builder.setDeactivated(object))
        .with(P.string.endsWith('targetNode'), () => builder.setTargetNode(object))
        .with(P.string.endsWith('message'), () => builder.setMessage(object))
        .with(P.string.endsWith('severity'), () => builder.setSeverity(object))
        .otherwise(() => {
          logger.warn(`Could not find a match for predicate ${predicate}`);
        });

      match(predicate)
        .with(P.string.endsWith('maxCount'), () => builder.setMaxCount(object))
        .with(P.string.endsWith('pattern'), () => builder.setPattern(object))
        .with(P.string.endsWith('class'), () => builder.setClass(object))
        .with(P.string.endsWith('nodeKind'), () => builder.setNodeKind(object))
        .with(P.string.endsWith('closed'), () => builder.setClosed(object));
    });

    this.shapesRegistry.getAll().forEach((shapeDefinition) => {
      if (shapeDefinition.nodeKey.includes('n3-')) {
        const idMapping = this.idRegistry.getIdMapping(shapeDefinition.nodeKey);
        if (!idMapping) {
          logger.error(`Could not base shape for n3-node ${shapeDefinition.nodeKey}`);
          return;
        }
        const builderForCurrentDefinition = this.shapesRegistry.getOrCreate(idMapping.shape);
        builderForCurrentDefinition.setDependentShapeDefinition(shapeDefinition);
      }
    });

    this.model.shapeDefinitions = this.shapesRegistry.getShapesDefinitions();

    return this.model;
  }
}
