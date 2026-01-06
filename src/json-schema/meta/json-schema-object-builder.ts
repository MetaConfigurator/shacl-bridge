import { JsonSchemaObjectType, JsonSchemaType, SchemaPropertyTypes } from './json-schema-type';

/**
 * Builder for constructing JsonSchemaObjectType instances.
 * Provides a fluent API for building JSON Schema objects with type safety.
 */
export class JsonSchemaObjectBuilder {
  private schema: JsonSchemaObjectType = {};

  /**
   * Sets the $schema keyword, which declares which dialect of JSON Schema the schema follows.
   * Example: "https://json-schema.org/draft/2020-12/schema"
   */
  $schema(schema: string): this {
    this.schema.$schema = schema;
    return this;
  }

  /**
   * Sets the $id keyword, which provides a base URI for resolving relative references.
   * For sub-schemas, this represents the path within the schema.
   */
  $id(id: string): this {
    this.schema.$id = id;
    return this;
  }

  /**
   * Sets the $vocabulary keyword, which declares the vocabularies used by the schema.
   * Keys are vocabulary URIs, values indicate whether the vocabulary is required.
   */
  $vocabulary(vocabulary: Record<string, boolean>): this {
    this.schema.$vocabulary = vocabulary;
    return this;
  }

  // ==================== Reference Keywords ====================

  $ref(ref: string): this {
    this.schema.$ref = ref;
    return this;
  }

  $anchor(anchor: string): this {
    this.schema.$anchor = anchor;
    return this;
  }

  $dynamicRef(dynamicRef: string): this {
    this.schema.$dynamicRef = dynamicRef;
    return this;
  }

  $dynamicAnchor(dynamicAnchor: string): this {
    this.schema.$dynamicAnchor = dynamicAnchor;
    return this;
  }

  $comment(comment: string): this {
    this.schema.$comment = comment;
    return this;
  }

  $defs(defs: Record<string, JsonSchemaType>): this {
    this.schema.$defs = defs;
    return this;
  }

  definitions(definitions: Record<string, JsonSchemaType>): this {
    this.schema.definitions = definitions;
    return this;
  }

  // ==================== Array Keywords ====================

  prefixItems(prefixItems: JsonSchemaType[]): this {
    this.schema.prefixItems = prefixItems;
    return this;
  }

  items(items: JsonSchemaType): this {
    this.schema.items = items;
    return this;
  }

  contains(contains: JsonSchemaType): this {
    this.schema.contains = contains;
    return this;
  }

  maxItems(maxItems: number): this {
    this.schema.maxItems = maxItems;
    return this;
  }

  minItems(minItems: number): this {
    this.schema.minItems = minItems;
    return this;
  }

  uniqueItems(uniqueItems: boolean): this {
    this.schema.uniqueItems = uniqueItems;
    return this;
  }

  maxContains(maxContains: number): this {
    this.schema.maxContains = maxContains;
    return this;
  }

  minContains(minContains: number): this {
    this.schema.minContains = minContains;
    return this;
  }

  // ==================== Object Keywords ====================

  properties(properties: Record<string, JsonSchemaType>): this {
    this.schema.properties = properties;
    return this;
  }

  patternProperties(patternProperties: Record<string, JsonSchemaType>): this {
    this.schema.patternProperties = patternProperties;
    return this;
  }

  additionalProperties(additionalProperties: JsonSchemaType): this {
    this.schema.additionalProperties = additionalProperties;
    return this;
  }

  propertyNames(propertyNames: JsonSchemaType): this {
    this.schema.propertyNames = propertyNames;
    return this;
  }

  maxProperties(maxProperties: number): this {
    this.schema.maxProperties = maxProperties;
    return this;
  }

  minProperties(minProperties: number): this {
    this.schema.minProperties = minProperties;
    return this;
  }

  requiredElement(requiredElement: string): this {
    this.schema.required ??= [];
    this.schema.required.push(requiredElement);
    return this;
  }

  required(required: string[]): this {
    this.schema.required = required;
    return this;
  }

  dependentSchemas(dependentSchemas: Record<string, JsonSchemaType>): this {
    this.schema.dependentSchemas = dependentSchemas;
    return this;
  }

  dependentRequired(dependentRequired: Record<string, string[]>): this {
    this.schema.dependentRequired = dependentRequired;
    return this;
  }

  dependencies(dependencies: Record<string, JsonSchemaType | string[]>): this {
    this.schema.dependencies = dependencies;
    return this;
  }

  // ==================== Type and Value Keywords ====================

  type(type: SchemaPropertyTypes): this {
    this.schema.type = type;
    return this;
  }

  const(constValue: unknown): this {
    this.schema.const = constValue;
    return this;
  }

  enum(enumValues: unknown[]): this {
    this.schema.enum = enumValues;
    return this;
  }

  // ==================== Numeric Constraints ====================

  multipleOf(multipleOf: number): this {
    this.schema.multipleOf = multipleOf;
    return this;
  }

  maximum(maximum: number): this {
    this.schema.maximum = maximum;
    return this;
  }

  exclusiveMaximum(exclusiveMaximum: number): this {
    this.schema.exclusiveMaximum = exclusiveMaximum;
    return this;
  }

  minimum(minimum: number): this {
    this.schema.minimum = minimum;
    return this;
  }

  exclusiveMinimum(exclusiveMinimum: number): this {
    this.schema.exclusiveMinimum = exclusiveMinimum;
    return this;
  }

  // ==================== String Constraints ====================

  maxLength(maxLength: number): this {
    this.schema.maxLength = maxLength;
    return this;
  }

  minLength(minLength: number): this {
    this.schema.minLength = minLength;
    return this;
  }

  pattern(pattern: string): this {
    this.schema.pattern = pattern;
    return this;
  }

  format(format: string): this {
    this.schema.format = format;
    return this;
  }

  // ==================== Composition Keywords ====================

  allOf(allOf: JsonSchemaType[]): this {
    this.schema.allOf = allOf;
    return this;
  }

  anyOf(anyOf: JsonSchemaType[]): this {
    this.schema.anyOf = anyOf;
    return this;
  }

  oneOf(oneOf: JsonSchemaType[]): this {
    this.schema.oneOf = oneOf;
    return this;
  }

  not(not: JsonSchemaType): this {
    this.schema.not = not;
    return this;
  }

  // ==================== Conditional Keywords ====================

  if(ifSchema: JsonSchemaType): this {
    this.schema.if = ifSchema;
    return this;
  }

  then(thenSchema: JsonSchemaType): this {
    this.schema.then = thenSchema;
    return this;
  }

  else(elseSchema: JsonSchemaType): this {
    this.schema.else = elseSchema;
    return this;
  }

  // ==================== Unevaluated Keywords ====================

  unevaluatedItems(unevaluatedItems: JsonSchemaType): this {
    this.schema.unevaluatedItems = unevaluatedItems;
    return this;
  }

  unevaluatedProperties(unevaluatedProperties: JsonSchemaType): this {
    this.schema.unevaluatedProperties = unevaluatedProperties;
    return this;
  }

  // ==================== Metadata Keywords ====================

  title(title: string): this {
    this.schema.title = title;
    return this;
  }

  description(description: string): this {
    this.schema.description = description;
    return this;
  }

  default(defaultValue: number | string | boolean): this {
    this.schema.default = defaultValue;
    return this;
  }

  deprecated(deprecated: boolean): this {
    this.schema.deprecated = deprecated;
    return this;
  }

  readOnly(readOnly: boolean): this {
    this.schema.readOnly = readOnly;
    return this;
  }

  writeOnly(writeOnly: boolean): this {
    this.schema.writeOnly = writeOnly;
    return this;
  }

  examples(examples: unknown[]): this {
    this.schema.examples = examples;
    return this;
  }

  // ==================== Content Keywords ====================

  contentEncoding(contentEncoding: string): this {
    this.schema.contentEncoding = contentEncoding;
    return this;
  }

  contentMediaType(contentMediaType: string): this {
    this.schema.contentMediaType = contentMediaType;
    return this;
  }

  contentSchema(contentSchema: JsonSchemaType): this {
    this.schema.contentSchema = contentSchema;
    return this;
  }

  // ==================== Legacy Keywords ====================

  $recursiveAnchor(recursiveAnchor: string): this {
    this.schema.$recursiveAnchor = recursiveAnchor;
    return this;
  }

  $recursiveRef(recursiveRef: string): this {
    this.schema.$recursiveRef = recursiveRef;
    return this;
  }

  // ==================== Custom Properties ====================

  /**
   * Add a custom property to the schema.
   * Useful for extensions like x-shacl-* or x-rdf-*.
   */
  customProperty(key: string, value: unknown): this {
    this.schema[key] = value;
    return this;
  }

  /**
   * Add multiple custom properties at once.
   */
  customProperties(properties: Record<string, unknown>): this {
    Object.entries(properties).forEach(([key, value]) => {
      this.schema[key] = value;
    });
    return this;
  }

  // ==================== Builder Methods ====================

  /**
   * Returns the built JsonSchemaObjectType.
   * Note: This returns a reference to the internal object, not a copy.
   */
  build(): JsonSchemaObjectType {
    return this.schema;
  }

  /**
   * Returns a deep copy of the built JsonSchemaObjectType.
   * Useful when you want to reuse the builder without mutations affecting the result.
   */
  buildCopy(): JsonSchemaObjectType {
    return JSON.parse(JSON.stringify(this.schema)) as JsonSchemaObjectType;
  }

  /**
   * Resets the builder to start building a new schema.
   */
  reset(): this {
    this.schema = {};
    return this;
  }

  /**
   * Creates a new builder instance from an existing schema.
   * Useful for modifying existing schemas.
   */
  static from(schema: JsonSchemaObjectType): JsonSchemaObjectBuilder {
    const builder = new JsonSchemaObjectBuilder();
    builder.schema = JSON.parse(JSON.stringify(schema)) as JsonSchemaObjectType;
    return builder;
  }

  getKey(key: keyof JsonSchemaObjectType): unknown {
    return this.schema[key];
  }

  /**
   * Merges properties from another JsonSchemaObjectType instance to this builder.
   * Only copies properties that don't already exist in the current schema.
   */
  mergeFrom(source: JsonSchemaObjectType): this {
    Object.keys(source).forEach((key) => {
      if (this.schema[key] === undefined) {
        this.schema[key] = source[key];
      }
    });
    return this;
  }
}
