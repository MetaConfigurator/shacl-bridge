import { ShapeBuilder } from './shape-builder';
import { Indexer } from './indexer';
import { DependencyGraphBuilder } from './dependency-graph';
import { SHAPE_TYPE } from './meta-model/shape';
import { StoreBuilder } from '../store/store-builder';
import {
  FOAF_PERSON,
  RDF_FIRST,
  RDF_NIL,
  RDF_REST,
  RDF_TYPE,
  SHACL_CLASS,
  SHACL_CLOSED,
  SHACL_DATATYPE,
  SHACL_DEACTIVATED,
  SHACL_HAS_VALUE,
  SHACL_IGNORED_PROPERTIES,
  SHACL_IN,
  SHACL_IRI,
  SHACL_LANGUAGE_IN,
  SHACL_MAX_COUNT,
  SHACL_MAX_EXCLUSIVE,
  SHACL_MAX_INCLUSIVE,
  SHACL_MAX_LENGTH,
  SHACL_MESSAGE,
  SHACL_MIN_COUNT,
  SHACL_MIN_EXCLUSIVE,
  SHACL_MIN_INCLUSIVE,
  SHACL_MIN_LENGTH,
  SHACL_NODE_KIND,
  SHACL_NODE_SHAPE,
  SHACL_OR,
  SHACL_PATH,
  SHACL_PATTERN,
  SHACL_PROPERTY,
  SHACL_PROPERTY_SHAPE,
  SHACL_QUALIFIED_VALUE_SHAPE,
  SHACL_SEVERITY,
  SHACL_TARGET_CLASS,
  SHACL_TARGET_NODE,
  SHACL_UNIQUE_LANG,
  XSD_STRING,
} from '../shacl/shacl-terms';
import { ShaclParser } from '../shacl/parser/shacl-parser';

async function getShapeDefinitionList(content: string) {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  const index = new Indexer(shaclDocument).build();
  const graphBuilder = new DependencyGraphBuilder(index, shaclDocument);
  const graph = graphBuilder.build();
  return new ShapeBuilder(shaclDocument, index, graph).build();
}

describe('TopologicalShapeBuilder', () => {
  describe('build', () => {
    it('should build a simple shape with no dependencies', async () => {
      const shape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_NODE_SHAPE)
        .triple(shape, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(shape);
      expect(result[0].shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
      expect(result[0].shape?.targetClasses?.[0]).toBe('http://xmlns.com/foaf/0.1/Person');
      expect(result[0].dependentShapes).toEqual([]);
    });

    it('should build a shape with single blank node dependency', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://xmlns.com/foaf/0.1/name')
        .literalInt('b1', SHACL_MIN_COUNT, 1, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.nodeKey).toBe('b1');
      expect(result[0].dependentShapes?.[0]?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
      expect(result[0].dependentShapes?.[0]?.shape?.path).toBe('http://xmlns.com/foaf/0.1/name');
      expect(result[0].dependentShapes?.[0]?.coreConstraints?.minCount).toBe(1);
    });

    it('should build a shape with multiple blank node dependencies', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .triple(parentShape, SHACL_PROPERTY, 'b2', true)
        .blank('b1', SHACL_PATH, 'http://xmlns.com/foaf/0.1/name')
        .blank('b2', SHACL_PATH, 'http://xmlns.com/foaf/0.1/age')
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(2);

      const depKeys = result[0].dependentShapes?.map((d) => d.nodeKey).sort();
      expect(depKeys).toEqual(['b1', 'b2']);
    });

    it('should build nested blank nodes (blank node depending on another blank node)', async () => {
      const parentShape = 'http://example.org/PersonShape';
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .blank('b1', SHACL_PATH, 'http://example.org/address')
        .bothBlank('b1', 'http://www.w3.org/ns/shacl#qualifiedValueShape', 'b2')
        .blank(
          'b2',
          'http://www.w3.org/ns/shacl#datatype',
          'http://www.w3.org/2001/XMLSchema#string'
        )
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].dependentShapes).toHaveLength(1);

      // Check first level dependency
      const firstDep = result[0].dependentShapes?.[0];
      expect(firstDep?.nodeKey).toBe('b1');
      expect(firstDep?.shape?.path).toBe('http://example.org/address');

      // Check nested dependency
      expect(firstDep?.dependentShapes).toHaveLength(1);
      expect(firstDep?.dependentShapes?.[0]?.nodeKey).toBe('b2');
      expect(firstDep?.dependentShapes?.[0]?.coreConstraints?.datatype).toBe(
        'http://www.w3.org/2001/XMLSchema#string'
      );
    });

    it('should build multiple independent shapes', async () => {
      const shape1 = 'http://example.org/PersonShape';
      const shape2 = 'http://example.org/CompanyShape';
      const content = await new StoreBuilder()
        .shape(shape1, SHACL_NODE_SHAPE)
        .triple(shape1, SHACL_TARGET_CLASS, FOAF_PERSON, false)
        .shape(shape2, SHACL_NODE_SHAPE)
        .triple(shape2, SHACL_TARGET_CLASS, 'http://example.org/Company', false)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(2);
      const resultKeys = result.map((r) => r.nodeKey).sort();
      expect(resultKeys).toEqual([shape2, shape1].sort());
    });

    it('should handle logical constraint shapes (or, and, not, xone)', async () => {
      const parentShape = 'http://example.org/IdentifierShape';

      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_OR, 'or1', true)
        .literalInt('or1', SHACL_MIN_COUNT, 1, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].nodeKey).toBe(parentShape);
      expect(result[0].coreConstraints?.or).toEqual(['or1']);
      expect(result[0].dependentShapes).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.nodeKey).toBe('or1');
    });

    it('should automatically set PropertyShape type for blank nodes referenced via sh:property', async () => {
      const parentShape = 'http://example.org/PersonShape';

      // Blank node WITHOUT explicit type (should be inferred as PropertyShape)
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_PROPERTY, 'b1', true)
        .literalInt('b1', SHACL_MIN_COUNT, 1, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    });

    it('should handle blank nodes that are not referenced via sh:property (should get default NodeShape type)', async () => {
      const parentShape = 'http://example.org/PersonShape';

      // Blank node referenced via 'or', not 'property'
      const content = await new StoreBuilder()
        .shape(parentShape, SHACL_NODE_SHAPE)
        .triple(parentShape, SHACL_OR, 'b1', true)
        .literalInt('b1', SHACL_MIN_COUNT, 1, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      // Should default to NodeShape since not referenced via sh:property
      expect(result[0].dependentShapes?.[0]?.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    });

    it('should build all SHACL constraint types', async () => {
      const shape = 'http://example.org/ComplexShape';

      // Add shape with all constraint types
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/complexProp', false)
        .literalInt(shape, SHACL_MIN_COUNT, 1)
        .literalInt(shape, SHACL_MAX_COUNT, 10)
        .literalInt(shape, SHACL_MIN_LENGTH, 3)
        .literalInt(shape, SHACL_MAX_LENGTH, 50)
        .literalString(shape, SHACL_PATTERN, '^[A-Z].*')
        .triple(shape, SHACL_NODE_KIND, SHACL_IRI, false)
        .triple(shape, SHACL_CLASS, 'http://example.org/Organization', false)
        .triple(shape, SHACL_DATATYPE, XSD_STRING, false)
        .literalInt(shape, SHACL_MIN_INCLUSIVE, 0)
        .literalInt(shape, SHACL_MAX_INCLUSIVE, 100)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      const constraints = result[0].coreConstraints;
      expect(constraints?.minCount).toBe(1);
      expect(constraints?.maxCount).toBe(10);
      expect(constraints?.minLength).toBe(3);
      expect(constraints?.maxLength).toBe(50);
      expect(constraints?.pattern).toBe('^[A-Z].*');
      expect(constraints?.class).toBe('http://example.org/Organization');
      expect(constraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');
      expect(constraints?.minInclusive).toBe(0);
      expect(constraints?.maxInclusive).toBe(100);
    });

    it('should handle closed shapes with ignored properties', async () => {
      const shape = 'http://example.org/ClosedShape';

      const content = await new StoreBuilder()
        .shape(shape, SHACL_NODE_SHAPE)
        .literalBool(shape, SHACL_CLOSED, true)
        .triple(shape, SHACL_IGNORED_PROPERTIES, 'l1', true)
        .blank('l1', RDF_FIRST, RDF_TYPE)
        .blank('l1', RDF_REST, RDF_NIL)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.closed).toBe(true);
      expect(result[0].coreConstraints?.ignoredProperties).toEqual([RDF_TYPE]);
    });

    it('should handle shapes with severity and deactivation', async () => {
      const shape = 'http://example.org/WarningShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/optionalField', false)
        .triple(shape, SHACL_SEVERITY, 'http://www.w3.org/ns/shacl#Warning', false)
        .literalBool(shape, SHACL_DEACTIVATED, true)
        .literalString(shape, SHACL_MESSAGE, 'This is deprecated')
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].shape?.severity).toBe('sh:Warning');
      expect(result[0].shape?.deactivated).toBe(true);
      expect(result[0].shape?.message?.[0].value).toBe('This is deprecated');
    });

    it('should handle qualified value shapes', async () => {
      const shape = 'http://example.org/ScoresShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/score', false)
        .triple(shape, SHACL_QUALIFIED_VALUE_SHAPE, 'q1', true)
        .literalInt(shape, 'http://www.w3.org/ns/shacl#qualifiedMinCount', 1)
        .literalInt(shape, 'http://www.w3.org/ns/shacl#qualifiedMaxCount', 10)
        .literalInt('q1', SHACL_MIN_INCLUSIVE, 0, true)
        .literalInt('q1', SHACL_MAX_INCLUSIVE, 100, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.qualifiedValueShape).toBe('q1');
      expect(result[0].coreConstraints?.qualifiedMinCount).toBe(1);
      expect(result[0].coreConstraints?.qualifiedMaxCount).toBe(10);
      expect(result[0].dependentShapes).toHaveLength(1);
      expect(result[0].dependentShapes?.[0]?.coreConstraints?.minInclusive).toBe(0);
      expect(result[0].dependentShapes?.[0]?.coreConstraints?.maxInclusive).toBe(100);
    });

    it('should handle uniqueLang constraint', async () => {
      const shape = 'http://example.org/LabelShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/label', false)
        .literalBool(shape, SHACL_UNIQUE_LANG, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.uniqueLang).toBe(true);
    });

    it('should handle hasValue constraint', async () => {
      const shape = 'http://example.org/DeprecatedShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/isDeprecated', false)
        .literalBool(shape, SHACL_HAS_VALUE, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.hasValue).toBe(true);
    });

    it('should handle languageIn constraint with blank node list', async () => {
      const shape = 'http://example.org/MultilingualShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/label', false)
        .triple(shape, SHACL_LANGUAGE_IN, 'l1', true)
        .literalString('l1', RDF_FIRST, 'en', true)
        .literalString('l1', RDF_REST, RDF_NIL, true)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.languageIn).toEqual(['l1']);
      expect(result[0].dependentShapes).toHaveLength(1);
    });

    it('should handle minExclusive and maxExclusive', async () => {
      const shape = 'http://example.org/RangeShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://example.org/value', false)
        .literalInt(shape, SHACL_MIN_EXCLUSIVE, 0)
        .literalInt(shape, SHACL_MAX_EXCLUSIVE, 100)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].coreConstraints?.minExclusive).toBe(0);
      expect(result[0].coreConstraints?.maxExclusive).toBe(100);
    });

    it('should handle in constraint with blank node list - single value', async () => {
      const shape = 'http://example.org/CountryCodeShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://schema.org/countryCode', false)
        .triple(shape, SHACL_IN, 'i1', true)
        .literalString('i1', RDF_FIRST, 'DE', true) // true = blank node subject
        .blank('i1', RDF_REST, RDF_NIL)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      // Should extract the actual value from the list, not the blank node identifier
      expect(result[0].coreConstraints?.in).toEqual(['DE']);
      expect(result[0].dependentShapes).toHaveLength(0); // List nodes should not be dependent shapes
    });

    it('should handle in constraint with multiple values in RDF list', async () => {
      const shape = 'http://example.org/CountryCodeShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_PROPERTY_SHAPE)
        .triple(shape, SHACL_PATH, 'http://schema.org/countryCode', false)
        .triple(shape, SHACL_IN, 'i1', true)
        .literalString('i1', RDF_FIRST, 'DE', true) // true = blank node subject
        .bothBlank('i1', RDF_REST, 'i2')
        .literalString('i2', RDF_FIRST, 'FR', true)
        .bothBlank('i2', RDF_REST, 'i3')
        .literalString('i3', RDF_FIRST, 'ES', true)
        .bothBlank('i3', RDF_REST, 'i4')
        .literalString('i4', RDF_FIRST, 'IT', true)
        .bothBlank('i4', RDF_REST, 'i5')
        .literalString('i5', RDF_FIRST, 'GB', true)
        .blank('i5', RDF_REST, RDF_NIL)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      // Should extract all values from the list in order
      expect(result[0].coreConstraints?.in).toEqual(['DE', 'FR', 'ES', 'IT', 'GB']);
      expect(result[0].dependentShapes).toHaveLength(0); // List nodes should not be dependent shapes
    });

    it('should handle targetNodes constraint', async () => {
      const shape = 'http://example.org/SpecificNodeShape';
      const content = await new StoreBuilder()
        .shape(shape, SHACL_NODE_SHAPE)
        .triple(shape, SHACL_TARGET_NODE, 'http://example.org/SpecificInstance', false)
        .write();

      const result = await getShapeDefinitionList(content);

      expect(result).toHaveLength(1);
      expect(result[0].shape?.targetNodes?.[0]).toBe('http://example.org/SpecificInstance');
    });
  });
});
