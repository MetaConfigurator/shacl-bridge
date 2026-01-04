import { IntermediateRepresentation } from '../ir/intermediate-representation-builder';
import { JsonSchemaObjectType, TopLevelSchema } from './json-schema-type';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { Stack } from '../stack/stack';
import { ShapeConverter } from './converters/shape-converter';
import { getTarget } from '../ir/target-resolver';
import { JSON_SCHEMA_DRAFT } from '../util/json-schema-terms';
import { hasKeyAtAnyLevel } from '../util/helpers';

export class IrSchemaConverter {
  constructor(private readonly ir: IntermediateRepresentation) {}

  convert(): TopLevelSchema {
    const { shapeDefinitions } = this.ir;
    const schemas: TopLevelSchema[] = [];
    for (const shapeDef of shapeDefinitions) {
      schemas.push(this.processBottomUp(shapeDef));
    }
    if (schemas.length > 0) {
      const schemaWithRef = schemas.find((ob) => hasKeyAtAnyLevel(ob, '$ref'));
      if (schemaWithRef != null && typeof schemaWithRef !== 'boolean') {
        const schemasWithoutRefs = schemas.filter((s) => s !== schemaWithRef);
        const defs: Record<string, Partial<TopLevelSchema>> = {};
        schemasWithoutRefs.forEach((schema) => {
          if (typeof schema !== 'boolean') {
            const { title, type, properties } = schema;
            const key = title ?? schema.$id ?? `schema-${String(Object.keys(defs).length)}`;
            defs[key] = {
              ...(title && { title }),
              ...(type && { type }),
              ...(properties && { properties }),
              required: schema.required,
            };
          }
        });
        // Only add $defs if there are actual definitions
        if (Object.keys(defs).length > 0) {
          schemaWithRef.$defs = defs;
        }
        return schemaWithRef;
      }
    }
    return schemas[0];
  }

  private processBottomUp(shapeDef: ShapeDefinition): TopLevelSchema {
    let schema: JsonSchemaObjectType = {};
    let requiredItems: string[] = [];
    const stack = new Stack<{ shape: ShapeDefinition; dependentsProcessed: boolean }>();
    stack.push({ shape: shapeDef, dependentsProcessed: false });
    while (!stack.isEmpty()) {
      const { shape, dependentsProcessed } = stack.peek() ?? {
        shape: {},
        dependentsProcessed: false,
      };
      if (!dependentsProcessed && (shape.dependentShapes?.length ?? 0) > 0) {
        stack.replaceTop({ shape: shapeDef, dependentsProcessed: true });
        shape.dependentShapes?.forEach((dependentShape) => {
          stack.push({ shape: dependentShape, dependentsProcessed: false });
        });
      } else {
        const top = stack.pop();
        if (top?.shape == null) continue;
        const { required, result } = new ShapeConverter(top.shape, this.ir.index, schema).convert();
        if (required.length > 0) {
          requiredItems = [...required, ...requiredItems];
        }
        if ((top.shape.coreConstraints?.property?.length ?? 0) > 0) schema = result;
        else schema = { ...schema, ...result };
      }
    }
    const target = getTarget(this.ir.index.targets, shapeDef.nodeKey);
    return {
      $schema: JSON_SCHEMA_DRAFT,
      $id: shapeDef.nodeKey,
      title: target,
      type: Array.isArray(schema) ? 'array' : 'object',
      ...schema,
      required: requiredItems,
      // Invert: sh:closed true → additionalProperties false (closed)
      additionalProperties: !shapeDef.coreConstraints?.closed,
    };
  }
}
