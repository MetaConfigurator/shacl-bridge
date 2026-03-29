import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import { StoreBuilder } from '../../store/store-builder';
import { WriterContext } from './writer-context';
import { Store } from 'n3';
import { TreeBuilder } from '../../tree/tree-builder';
import { NodeProcessor } from '../tree-processor/node-processor';

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
    const root = new TreeBuilder(this.schema).build();
    new NodeProcessor(this.context).process(root, this.context.shapeUri);
  }
}
