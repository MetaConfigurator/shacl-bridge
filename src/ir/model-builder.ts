import { ShaclDocument } from '../shacl/model/shacl-document';
import { Model } from './meta-model/model';
import { Indexer } from './indexer';
import { DependencyGraphBuilder } from './dependency-graph';
import { ShapeBuilder } from './shape-builder';

export class ModelBuilder {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  build(): Model {
    const index = new Indexer(this.shaclDocument.store).build();
    const graph = new DependencyGraphBuilder(index).build();
    const shapeDefinitions = new ShapeBuilder(index, graph).build();
    return { shapeDefinitions };
  }
}
