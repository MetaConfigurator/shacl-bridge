import { ShapeDefinition } from '../../ir/meta-model/shape-definition';
import { SHAPE_TYPE } from '../../ir/meta-model/shape';
import { GeneratorConfig, JsonSchema } from '../types';
import { PropertyConverter } from './property-converter';
import { extractName } from '../../util/helpers';

export class ShapeConverter {
  private readonly propertyConverter: PropertyConverter;

  constructor(private readonly config: GeneratorConfig) {
    this.propertyConverter = new PropertyConverter();
  }

  /**
   * Converts a SHACL ShapeDefinition to a JSON Schema
   * @param shape The SHACL shape definition
   * @returns JSON Schema representation
   */
  convert(shape: ShapeDefinition): JsonSchema {
    const schema: JsonSchema = {
      type: 'object',
    };

    // Set title from nodeKey
    schema.title = extractName(shape.nodeKey);

    // Handle properties from dependent shapes
    this.convertProperties(shape, schema);

    // Handle sh:closed
    if (shape.coreConstraints?.closed === true) {
      schema.additionalProperties = false;
    }

    // Handle logical operators
    this.convertLogicalOperators(shape, schema);

    // Handle metadata if configured
    if (this.config.includeMetadata) {
      this.addMetadata(shape, schema);
    }

    // Handle RDF metadata preservation
    if (this.config.preserveRdfMetadata && shape.additionalProperties) {
      schema['x-rdf-properties'] = shape.additionalProperties.map((prop) => ({
        predicate: prop.predicate,
        value: prop.value,
      }));
    }

    return schema;
  }

  /**
   * Converts dependent PropertyShapes to JSON Schema properties
   */
  private convertProperties(shape: ShapeDefinition, schema: JsonSchema): void {
    const propertyShapes = shape.dependentShapes?.filter(
      (dep) => dep.shape?.type === SHAPE_TYPE.PROPERTY_SHAPE
    );

    if (!propertyShapes || propertyShapes.length === 0) {
      return;
    }

    schema.properties = {};
    const requiredProps: string[] = [];

    for (const propShape of propertyShapes) {
      const result = this.propertyConverter.convert(propShape);

      if (result.propertyName) {
        schema.properties[result.propertyName] = result.schema;

        if (result.required) {
          requiredProps.push(result.propertyName);
        }
      }
    }

    if (requiredProps.length > 0) {
      schema.required = requiredProps;
    }
  }

  /**
   * Converts SHACL logical operators to JSON Schema composition
   */
  private convertLogicalOperators(shape: ShapeDefinition, schema: JsonSchema): void {
    const constraints = shape.coreConstraints;
    if (!constraints) {
      return;
    }

    // sh:or → anyOf
    if (constraints.or && constraints.or.length > 0) {
      schema.anyOf = constraints.or.map((ref) => this.resolveShapeReference(ref, shape));
    }

    // sh:and → allOf
    if (constraints.and && constraints.and.length > 0) {
      schema.allOf = constraints.and.map((ref) => this.resolveShapeReference(ref, shape));
    }

    // sh:xone → oneOf
    if (constraints.xone && constraints.xone.length > 0) {
      schema.oneOf = constraints.xone.map((ref) => this.resolveShapeReference(ref, shape));
    }

    // sh:not → not (takes first element only as JSON Schema not is singular)
    if (constraints.not && constraints.not.length > 0) {
      schema.not = this.resolveShapeReference(constraints.not[0], shape);
    }
  }

  /**
   * Resolves a shape reference - inlines blank nodes, creates $ref for named shapes
   */
  private resolveShapeReference(nodeKey: string, parentShape: ShapeDefinition): JsonSchema {
    // Check if this is a blank node in dependentShapes
    const dependentShape = parentShape.dependentShapes?.find((dep) => dep.nodeKey === nodeKey);

    if (dependentShape) {
      // This is a blank node - inline it by converting directly
      const inlinedSchema = this.convert(dependentShape);

      // Remove the title if it's a blank node ID (starts with 'n3-')
      if (inlinedSchema.title?.startsWith('n3-')) {
        delete inlinedSchema.title;
      }

      return inlinedSchema;
    } else {
      // This is a named shape - create a $ref
      return {
        $ref: `#/$defs/${extractName(nodeKey)}`,
      };
    }
  }

  /**
   * Adds SHACL metadata as x-shacl-* extensions
   */
  private addMetadata(shape: ShapeDefinition, schema: JsonSchema): void {
    if (shape.shape?.targetClass) {
      schema['x-shacl-targetClass'] = shape.shape.targetClass;
    }

    if (shape.shape?.severity) {
      schema['x-shacl-severity'] = shape.shape.severity;
    }

    if (shape.shape?.message) {
      schema['x-shacl-message'] = shape.shape.message;
    }
  }
}
