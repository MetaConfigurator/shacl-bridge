import { GeneratorConfig, JsonSchema, Mode, Result } from './types';
import { ShapeConverter } from './converters/shape-converter';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { JSON_SCHEMA_DRAFT } from '../util/json-schema-terms';
import { extractName } from '../util/helpers';

class JsonSchemaGenerator {
  private readonly shapeConverter: ShapeConverter;

  constructor(private readonly config: GeneratorConfig) {
    this.shapeConverter = new ShapeConverter(config);
  }

  generate(ir: ShapeDefinition[]): Result {
    return this.config.mode === Mode.Single
      ? this.generateSingleSchema(ir)
      : this.generateMultiSchema(ir);
  }

  private generateSingleSchema(ir: ShapeDefinition[]): JsonSchema {
    const schema: JsonSchema = {
      $schema: JSON_SCHEMA_DRAFT,
    };

    if (ir.length === 0) {
      return schema;
    }

    schema.$defs = {};
    for (const shapeDef of ir) {
      const name = extractName(shapeDef.nodeKey);
      schema.$defs[name] = this.shapeConverter.convert(shapeDef);
    }

    // Set root $ref to first shape
    const firstName = extractName(ir[0].nodeKey);
    schema.$ref = `#/$defs/${firstName}`;

    return schema;
  }

  private generateMultiSchema(ir: ShapeDefinition[]): { schemas: Map<string, JsonSchema> } {
    const schemas = new Map<string, JsonSchema>();

    for (const shapeDef of ir) {
      const name = extractName(shapeDef.nodeKey);
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
}

export default JsonSchemaGenerator;
