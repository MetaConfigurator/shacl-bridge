import { JsonSchemaObjectType } from '../../json-schema/meta/json-schema-type';
import { StoreBuilder } from '../../util/store-builder';
import { DEFAULT_BASE } from '../../util/rdf-terms';

export class WriterContext {
  readonly baseUri: string;
  readonly shapeUri: string;
  readonly store: StoreBuilder;

  private blankNodeCounter = 0;

  constructor(schema: JsonSchemaObjectType) {
    this.baseUri = this.extractBaseUri(schema.$id);
    this.shapeUri = schema.$id ?? `${this.baseUri}Shape`;
    this.store = new StoreBuilder();
  }

  resolveRef(ref: string): string {
    return ref.startsWith('#/$defs/') ? `${this.baseUri}${ref.substring('#/$defs/'.length)}` : ref;
  }

  nextBlankId(): string {
    return `b${String(this.blankNodeCounter++)}`;
  }

  buildPropertyUri(propertyName: string): string {
    return `${this.baseUri}${propertyName}`;
  }

  buildDefUri(defName: string): string {
    return `${this.baseUri}${defName}`;
  }

  private extractBaseUri(id: string | undefined): string {
    if (!id) return DEFAULT_BASE;
    const lastSlash = id.lastIndexOf('/');
    const lastHash = id.lastIndexOf('#');
    const cutoff = Math.max(lastSlash, lastHash);
    return cutoff > 0 ? id.substring(0, cutoff + 1) : DEFAULT_BASE;
  }
}
