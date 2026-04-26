import { SchemaEdge } from '../../../tree/types';
import { JsonSchemaObjectType } from '../../../json-schema/meta/json-schema-type';
import {
  RDF_FIRST,
  RDF_NIL,
  RDF_REST,
  SHACL_MAX_COUNT,
  SHACL_MIN_COUNT,
  SHACL_NODE,
  SHACL_PATH,
  SHACL_PROPERTY,
  SHACL_QUALIFIED_MAX_COUNT,
  SHACL_QUALIFIED_MIN_COUNT,
  SHACL_QUALIFIED_VALUE_SHAPE,
  SHACL_ZERO_OR_MORE_PATH,
} from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ShaclMapper } from '../mapper/shacl-mapper';

export class ArrayRootProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly shaclMapper: ShaclMapper
  ) {}

  process(
    schema: JsonSchemaObjectType,
    children: SchemaEdge[],
    subject: string,
    isBlank: boolean
  ): void {
    const itemsEdge = children.find((e) => e.label === 'items');

    if (itemsEdge != null || schema.minItems != null || schema.maxItems != null) {
      const propBlankId = this.context.nextBlankId();
      this.context.store.linkBlank(subject, SHACL_PROPERTY, propBlankId, isBlank);
      this.emitListItemPath(propBlankId);

      if (schema.minItems != null) {
        this.context.store.literalInt(propBlankId, SHACL_MIN_COUNT, schema.minItems, true);
      }
      if (schema.maxItems != null) {
        this.context.store.literalInt(propBlankId, SHACL_MAX_COUNT, schema.maxItems, true);
      }

      if (itemsEdge != null) {
        const itemsSchema = itemsEdge.node.schema;
        if (itemsSchema.$ref) {
          this.context.store.blank(
            propBlankId,
            SHACL_NODE,
            this.context.resolveRef(itemsSchema.$ref)
          );
        } else {
          this.shaclMapper.map(itemsSchema, propBlankId, true);
        }
      }
    }

    const containsEdge = children.find((e) => e.label === 'contains');
    if (containsEdge != null) {
      const propBlankId = this.context.nextBlankId();
      this.context.store.linkBlank(subject, SHACL_PROPERTY, propBlankId, isBlank);
      this.emitListItemPath(propBlankId);

      const qualifiedBlankId = this.context.nextBlankId();
      this.context.store.bothBlank(propBlankId, SHACL_QUALIFIED_VALUE_SHAPE, qualifiedBlankId);

      const containsSchema = containsEdge.node.schema;
      if (containsSchema.$ref) {
        this.context.store.blank(
          qualifiedBlankId,
          SHACL_NODE,
          this.context.resolveRef(containsSchema.$ref)
        );
      } else {
        this.shaclMapper.map(containsSchema, qualifiedBlankId, true);
      }

      const minContains = schema.minContains ?? 1;
      this.context.store.literalInt(propBlankId, SHACL_QUALIFIED_MIN_COUNT, minContains, true);
      if (schema.maxContains != null) {
        this.context.store.literalInt(
          propBlankId,
          SHACL_QUALIFIED_MAX_COUNT,
          schema.maxContains,
          true
        );
      }
    }
  }

  private emitListItemPath(propBlankId: string): void {
    const zeroOrMoreBlankId = this.context.nextBlankId();
    const listNode1Id = this.context.nextBlankId();
    const listNode2Id = this.context.nextBlankId();

    // propBlank sh:path _:listNode1
    this.context.store.bothBlank(propBlankId, SHACL_PATH, listNode1Id);

    // _:listNode1 rdf:first _:zeroOrMoreBlank ; rdf:rest _:listNode2
    this.context.store.bothBlank(listNode1Id, RDF_FIRST, zeroOrMoreBlankId);
    this.context.store.bothBlank(listNode1Id, RDF_REST, listNode2Id);

    // _:zeroOrMoreBlank sh:zeroOrMorePath rdf:rest
    this.context.store.blank(zeroOrMoreBlankId, SHACL_ZERO_OR_MORE_PATH, RDF_REST);

    // _:listNode2 rdf:first rdf:first ; rdf:rest rdf:nil
    this.context.store.blank(listNode2Id, RDF_FIRST, RDF_FIRST);
    this.context.store.blank(listNode2Id, RDF_REST, RDF_NIL);
  }
}
