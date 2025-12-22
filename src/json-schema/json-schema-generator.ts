import { Model } from '../ir/meta-model/model';
import {
  GeneratorConfig,
  GeneratorResult,
  JsonSchema,
  MultiSchemaResult,
  SingleSchemaResult,
} from './types';
import { ShapeConverter } from './converters/shape-converter';

const JSON_SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';

export class JsonSchemaGenerator {
  private readonly shapeConverter: ShapeConverter;

  constructor(private readonly config: GeneratorConfig) {
    this.shapeConverter = new ShapeConverter(config);
  }

  /**
   * Generates JSON Schema(s) from an IR Model
   * @param model The IR model containing shape definitions
   * @returns Single schema or map of schemas depending on config mode
   */
  generate(model: Model): GeneratorResult {
    if (this.config.mode === 'single') {
      return this.generateSingleSchema(model);
    } else {
      return this.generateMultiSchema(model);
    }
  }

  /**
   * Generates a single JSON Schema with all shapes in $defs
   */
  private generateSingleSchema(model: Model): SingleSchemaResult {
    const schema: JsonSchema = {
      $schema: JSON_SCHEMA_DRAFT,
    };

    if (model.shapeDefinitions.length === 0) {
      return { schema };
    }

    // Convert all shapes and place in $defs
    schema.$defs = {};
    for (const shapeDef of model.shapeDefinitions) {
      const name = this.extractName(shapeDef.nodeKey);
      schema.$defs[name] = this.shapeConverter.convert(shapeDef);
    }

    // Set root $ref to first shape
    const firstName = this.extractName(model.shapeDefinitions[0].nodeKey);
    schema.$ref = `#/$defs/${firstName}`;

    return { schema };
  }

  /**
   * Generates multiple JSON Schemas, one per shape
   */
  private generateMultiSchema(model: Model): MultiSchemaResult {
    const schemas = new Map<string, JsonSchema>();

    for (const shapeDef of model.shapeDefinitions) {
      const name = this.extractName(shapeDef.nodeKey);
      const shapeSchema = this.shapeConverter.convert(shapeDef);

      // Add schema metadata
      shapeSchema.$schema = JSON_SCHEMA_DRAFT;
      shapeSchema.$id = `${name}.json`;

      // Convert internal $refs to file-based refs
      this.convertRefsToFileRefs(shapeSchema);

      schemas.set(name, shapeSchema);
    }

    return { schemas };
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
