import { GeneratorConfig, JsonSchema, Mode, Result } from './types';
import { ShapeConverter } from './converters/shape-converter';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { JSON_SCHEMA_DRAFT } from '../util/json-schema-terms';

export class JsonSchemaGenerator {
  private readonly shapeConverter: ShapeConverter;

  constructor(private readonly config: GeneratorConfig) {
    this.shapeConverter = new ShapeConverter(config);
  }

  generate(ir: ShapeDefinition[]): Result {
    return this.config.mode === Mode.Single
      ? this.generateSingleSchema(ir)
      : this.generateMultiSchema(ir);
  }

  /**
   * Generates a single JSON Schema with all shapes in $defs
   */
  private generateSingleSchema(ir: ShapeDefinition[]): JsonSchema {
    const schema: JsonSchema = {
      $schema: JSON_SCHEMA_DRAFT,
    };

    if (ir.length === 0) {
      return schema;
    }

    schema.$defs = {};
    for (const shapeDef of ir) {
      const name = this.extractName(shapeDef.nodeKey);
      schema.$defs[name] = this.shapeConverter.convert(shapeDef);
    }

    // Set root $ref to first shape
    const firstName = this.extractName(ir[0].nodeKey);
    schema.$ref = `#/$defs/${firstName}`;

    return schema;
  }

  /**
   * Generates multiple JSON Schemas, one per shape
   */
  private generateMultiSchema(ir: ShapeDefinition[]): { schemas: Map<string, JsonSchema> } {
    const schemas = new Map<string, JsonSchema>();

    for (const shapeDef of ir) {
      const name = this.extractName(shapeDef.nodeKey);
      const shapeSchema = this.shapeConverter.convert(shapeDef);

      // Add schema metadata
      shapeSchema.$schema = JSON_SCHEMA_DRAFT;
      shapeSchema.$id = `${name}.json`;

      // Convert internal $refs to file-based refs
      this.convertRefsToFileRefs(shapeSchema);

      schemas.set(name, shapeSchema);
    }

    return { schemas: schemas };
  }

  /**
   * Converts $defs references to file-based references
   * e.g., #/$defs/Address → Address.json
   */
  private convertRefsToFileRefs(schema: JsonSchema): void {
    if (schema.$ref?.startsWith('#/$defs/')) {
      const refName = schema.$ref.replace('#/$defs/', '');
      schema.$ref = `${refName}.json`;
    }

    // Process nested schemas
    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) {
        this.convertRefsToFileRefs(prop);
      }
    }

    if (schema.items) {
      this.convertRefsToFileRefs(schema.items);
    }

    if (schema.anyOf) {
      for (const sub of schema.anyOf) {
        this.convertRefsToFileRefs(sub);
      }
    }

    if (schema.allOf) {
      for (const sub of schema.allOf) {
        this.convertRefsToFileRefs(sub);
      }
    }

    if (schema.oneOf) {
      for (const sub of schema.oneOf) {
        this.convertRefsToFileRefs(sub);
      }
    }

    if (schema.not) {
      this.convertRefsToFileRefs(schema.not);
    }
  }

  /**
   * Extracts name from a URI (last segment after / or #)
   */
  private extractName(uri: string): string {
    if (!uri) {
      return '';
    }

    const hashIndex = uri.lastIndexOf('#');
    if (hashIndex !== -1 && hashIndex < uri.length - 1) {
      return uri.substring(hashIndex + 1);
    }

    const slashIndex = uri.lastIndexOf('/');
    if (slashIndex !== -1 && slashIndex < uri.length - 1) {
      return uri.substring(slashIndex + 1);
    }

    return uri;
  }
}
