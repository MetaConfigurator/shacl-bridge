import { ShaclDocument } from '../shacl/shacl-document';
import { ShapeDefinition } from './meta-model/shape-definition';
import { Index, Indexer } from './indexer';
import { DependencyGraphBuilder } from './dependency-graph';
import { ShapeBuilder } from './shape-builder';

export interface IntermediateRepresentation {
  index: Index;
  shaclDocument: ShaclDocument;
  shapeDefinitions: ShapeDefinition[];
}

export class IntermediateRepresentationBuilder {
  constructor(private readonly shaclDocument: ShaclDocument) {}

  build(): IntermediateRepresentation {
    const index = new Indexer(this.shaclDocument).build();
    const graph = new DependencyGraphBuilder(index, this.shaclDocument).build();
    return {
      index: index,
      shaclDocument: this.shaclDocument,
      shapeDefinitions: new ShapeBuilder(this.shaclDocument, index, graph).build(),
    };
  }
}
