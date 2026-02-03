import { GraphBuilder } from '../../graph/graph-builder';
import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import { StoreBuilder } from '../../util/store-builder';
import { NodeProcessor } from '../graph-processor/node-processor';
import { WriterContext } from './writer-context';
import { Store } from 'n3';

export class ShaclWriter {
  private readonly context: WriterContext;

  constructor(private readonly schema: JsonSchemaObjectType) {
    this.context = new WriterContext(schema);
  }

  build(): Store {
    this.process();
    return this.context.store.build();
  }

  getStoreBuilder(): StoreBuilder {
    this.process();
    return this.context.store;
  }

  private process(): void {
    const graph = new GraphBuilder(this.schema).build();
    const processor = new NodeProcessor(this.context, graph);

    const rootNode = graph.nodes.find((n) => n.key === 'root');
    if (rootNode) {
      processor.process(rootNode, this.context.shapeUri);
    }
  }
}
