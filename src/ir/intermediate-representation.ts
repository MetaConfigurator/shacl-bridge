import { ShaclDocument } from '../shacl/shacl-document';
import { ShapeDefinition } from './meta-model/shape-definition';
import { Indexer } from './indexer';
import { DependencyGraphBuilder } from './dependency-graph';
import { ShapeBuilder } from './shape-builder';

export class IntermediateRepresentation {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  build(): ShapeDefinition[] {
    const index = new Indexer(this.shaclDocument).build();
    const graph = new DependencyGraphBuilder(index, this.shaclDocument).build();
    return new ShapeBuilder(this.shaclDocument, index, graph).build();
  }
}
