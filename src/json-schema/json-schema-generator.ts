import { GeneratorConfig, JsonSchema, Mode, Result } from './types';
import { ShapeConverter } from './converters/shape-converter';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { JSON_SCHEMA_DRAFT } from '../util/json-schema-terms';
import { IntermediateRepresentation } from '../ir/intermediate-representation-builder';
import { Index } from '../ir/indexer';
import { Term } from 'n3';

class JsonSchemaGenerator {
  private readonly shapeConverter: ShapeConverter;

  constructor(private readonly config: GeneratorConfig) {
    this.shapeConverter = new ShapeConverter(config);
  }

  generate(ir: IntermediateRepresentation): Result {
    const { index, shapeDefinitions } = ir;

    return this.config.mode === Mode.Single
      ? this.generateSingleSchema(shapeDefinitions, index)
      : this.generateMultiSchema(shapeDefinitions, index);
  }

  private generateSingleSchema(shapeDefinitions: ShapeDefinition[], index: Index): JsonSchema {
    const schema: JsonSchema = {
      $schema: JSON_SCHEMA_DRAFT,
    };

    if (shapeDefinitions.length === 0) {
      return schema;
    }

    schema.$defs = {};

    for (const shapeDef of shapeDefinitions) {
      const shapeSchema = this.shapeConverter.convert(shapeDef);
      const targetNames = this.getTargets(index.targets, shapeDef.nodeKey);
      schema.title = targetNames[0];
      for (const targetName of targetNames) {
        schema.$defs[targetName] = shapeSchema;
        schema.$ref ??= `#/$defs/${targetName}`;
      }
    }

    return schema;
  }

  private generateMultiSchema(
    shapeDefinitions: ShapeDefinition[],
    index: Index
  ): { schemas: Map<string, JsonSchema> } {
    const schemas = new Map<string, JsonSchema>();

    for (const shapeDef of shapeDefinitions) {
      const targetNames = this.getTargets(index.targets, shapeDef.nodeKey);

      // Skip shapes with no targets and no references
      if (targetNames.length === 0) {
        continue;
      }

      const shapeSchema = this.shapeConverter.convert(shapeDef);
      shapeSchema.title = targetNames[0];

      // Create a schema file for each target name
      for (const targetName of targetNames) {
        // Add schema metadata
        const schemaWithMetadata = {
          ...shapeSchema,
          $schema: JSON_SCHEMA_DRAFT,
          $id: `${targetName}.json`,
        };

        // Convert internal $refs to file-based refs
        this.convertRefsToFileRefs(schemaWithMetadata);

        schemas.set(targetName, schemaWithMetadata);
      }
    }

    return { schemas: schemas };
  }

  private getTargets(targets: Map<Term, string[]>, nodeKey: string): string[] {
    const term = [...targets.keys()].find((key) => key.value === nodeKey);
    return term ? (targets.get(term) ?? []) : [];
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
