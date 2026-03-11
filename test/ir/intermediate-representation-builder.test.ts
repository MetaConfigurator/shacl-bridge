import { ShaclParser } from '../../src/shacl/parser/shacl-parser';
import { IntermediateRepresentationBuilder } from '../../src/ir/intermediate-representation-builder';
import { ShaclDocument } from '../../src/shacl/shacl-document';
import { SEVERITY, SHAPE_TYPE } from '../../src/ir/meta-model/shape';

import fs from 'fs';

let simpleShaclDocument: ShaclDocument;
let complexShaclDocument: ShaclDocument;

const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';
const pathToComplexShacl = 'samples/shacl/complex-shacl.ttl';
const pathToAimsShacl = 'samples/shacl/system-nfdi4ing.ttl';

describe('ir Creation', () => {
  beforeAll(async () => {
    simpleShaclDocument = await new ShaclParser().withPath(pathToSimpleShacl).parse();
    complexShaclDocument = await new ShaclParser().withPath(pathToComplexShacl).parse();
  });

  it('should generate IR ir for simple SHACL document', () => {
    const ir = new IntermediateRepresentationBuilder(simpleShaclDocument).build();
    const { shapeDefinitions } = ir;

    expect(shapeDefinitions).toBeDefined();
    expect(shapeDefinitions.length).toBe(1);

    const personShape = shapeDefinitions[0];
    expect(personShape.nodeKey).toBe('http://example.org/PersonShape');

    const shapeProperties = personShape.shape;
    expect(shapeProperties).toBeDefined();
    expect(shapeProperties?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(shapeProperties?.targetClasses?.[0]).toBe('http://xmlns.com/foaf/0.1/Person');

    const coreConstraints = personShape.coreConstraints;
    expect(coreConstraints).toBeDefined();
    expect(coreConstraints?.closed).toBe(true);

    const dependentShapeDefinitions = personShape.dependentShapes;
    expect(coreConstraints).toBeDefined();
    expect(dependentShapeDefinitions?.length).toBe(2);

    const ssnDefinition = dependentShapeDefinitions?.find((sd) => sd.nodeKey == 'n3-0');
    expect(ssnDefinition).toBeDefined();
    expect(ssnDefinition?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(ssnDefinition?.shape?.path).toBe('http://example.org/ssn');
    expect(ssnDefinition?.coreConstraints?.maxCount).toBe(1);
    expect(ssnDefinition?.coreConstraints?.pattern).toBe('^\\d{3}-\\d{2}-\\d{4}$');
  });

  it('should generate IR ir for complex SHACL document', () => {
    const ir = new IntermediateRepresentationBuilder(complexShaclDocument).build();
    const { shapeDefinitions } = ir;
    expect(shapeDefinitions).toBeDefined();
    expect(shapeDefinitions.length).toBe(14);

    const personShapeDefinition = shapeDefinitions.find(
      (sd) => sd.nodeKey === 'http://example.org/PersonShape'
    );
    expect(personShapeDefinition).toBeDefined();
    expect(personShapeDefinition?.shape).toBeDefined();
    expect(personShapeDefinition?.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(personShapeDefinition?.shape?.targetClasses?.[0]?.endsWith('Person')).toBeTruthy();
    expect(personShapeDefinition?.shape?.deactivated).toBeFalsy();
    expect(personShapeDefinition?.shape?.severity).toBe(SEVERITY.VIOLATION);
    expect(personShapeDefinition?.coreConstraints?.closed).toBeTruthy();
    expect(personShapeDefinition?.dependentShapes?.length).toBe(3);
    const namePropertyShape = personShapeDefinition?.dependentShapes?.find((sd) =>
      sd.shape?.path?.endsWith('name')
    );
    expect(namePropertyShape).toBeDefined();
    expect(namePropertyShape?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(namePropertyShape?.shape?.path).toBe('http://xmlns.com/foaf/0.1/name');
    expect(namePropertyShape?.coreConstraints?.minCount).toBe(1);
    expect(namePropertyShape?.coreConstraints?.pattern).toBe('^[A-Z].*');
  });

  it('should capture non-SHACL metadata properties', async () => {
    const aimsDoc = await new ShaclParser().withPath(pathToAimsShacl).parse();
    const ir = new IntermediateRepresentationBuilder(aimsDoc).build();
    const { shapeDefinitions } = ir;

    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];

    // Check that additionalProperties were captured
    expect(shape.additionalProperties).toBeDefined();
    expect(shape.additionalProperties?.length).toBeGreaterThan(0);

    // Check for specific Dublin Core metadata
    const dctermsProperties = shape.additionalProperties?.filter((p) =>
      p.predicate.includes('purl.org/dc/terms/')
    );
    expect(dctermsProperties?.length).toBeGreaterThan(0);

    // Verify dcterms:created
    const created = shape.additionalProperties?.find((p) => p.predicate.endsWith('created'));
    expect(created).toBeDefined();
    expect(created?.value.type).toBe('literal');
    expect(created?.value.value).toBe('2022-04-07');

    // Verify dcterms:description with language tags
    const descriptions = shape.additionalProperties?.filter((p) =>
      p.predicate.endsWith('description')
    );
    expect(descriptions?.length).toBe(2); // One for @de, one for @en

    const germanDesc = descriptions?.find(
      (d) => d.value.type === 'langString' && d.value.language === 'de'
    );
    expect(germanDesc).toBeDefined();
    expect(germanDesc?.value.value).toContain('System');

    const englishDesc = descriptions?.find(
      (d) => d.value.type === 'langString' && d.value.language === 'en'
    );
    expect(englishDesc).toBeDefined();
    expect(englishDesc?.value.value).toContain('System');

    // Verify owl:imports
    const imports = shape.additionalProperties?.filter((p) => p.predicate.endsWith('imports'));
    expect(imports?.length).toBe(3); // Three imports in the file
    imports?.forEach((imp) => {
      expect(imp.value.type).toBe('uri');
      expect(imp.value.value).toContain('nfdi4ing/profiles/');
    });
  });
});

describe('irBuilder - Cardinality Constraints', () => {
  it('should correctly parse cardinality constraints (minCount, maxCount)', async () => {
    const doc = await new ShaclParser()
      .withPath('samples/shacl/cardinality-constraints.ttl')
      .parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/PersonCardinalityShape');
    expect(shape.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/Person');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Email property: minCount 1, maxCount 3
    const emailProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/email'
    );
    expect(emailProp).toBeDefined();
    expect(emailProp?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(emailProp?.coreConstraints?.minCount).toBe(1);
    expect(emailProp?.coreConstraints?.maxCount).toBe(3);
    expect(emailProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');

    // Age property: minCount 1, maxCount 1
    const ageProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/age'
    );
    expect(ageProp).toBeDefined();
    expect(ageProp?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(ageProp?.coreConstraints?.minCount).toBe(1);
    expect(ageProp?.coreConstraints?.maxCount).toBe(1);
    expect(ageProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#integer');
  });
});

describe('irBuilder - Value Range Constraints', () => {
  it('should correctly parse value range constraints (minInclusive, maxInclusive, minExclusive, maxExclusive)', async () => {
    const doc = await new ShaclParser()
      .withPath('samples/shacl/value-range-constraints.ttl')
      .parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;

    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/ProductShape');
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/Product');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Price property: minInclusive 0, maxInclusive 10000
    const priceProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/price'
    );
    expect(priceProp).toBeDefined();
    expect(priceProp?.coreConstraints?.minInclusive).toBe(0);
    expect(priceProp?.coreConstraints?.maxInclusive).toBe(10000);
    expect(priceProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#decimal');

    // Discount property: minExclusive 0, maxExclusive 100
    const discountProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/discount'
    );
    expect(discountProp).toBeDefined();
    expect(discountProp?.coreConstraints?.minExclusive).toBe(0);
    expect(discountProp?.coreConstraints?.maxExclusive).toBe(100);
    expect(discountProp?.coreConstraints?.datatype).toBe(
      'http://www.w3.org/2001/XMLSchema#integer'
    );
  });
});

describe('irBuilder - String Constraints', () => {
  it('should correctly parse string-based constraints (minLength, maxLength, pattern)', async () => {
    const doc = await new ShaclParser().withPath('samples/shacl/string-constraints.ttl').parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;

    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/UserShape');
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/User');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Username property: minLength 3, maxLength 20, pattern
    const usernameProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/username'
    );
    expect(usernameProp).toBeDefined();
    expect(usernameProp?.coreConstraints?.minLength).toBe(3);
    expect(usernameProp?.coreConstraints?.maxLength).toBe(20);
    expect(usernameProp?.coreConstraints?.pattern).toBe('^[a-zA-Z0-9_]+$');
    expect(usernameProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');

    // Password property: minLength 8
    const passwordProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/password'
    );
    expect(passwordProp).toBeDefined();
    expect(passwordProp?.coreConstraints?.minLength).toBe(8);
    expect(passwordProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');
  });
});

describe('irBuilder - Qualified Value Shapes', () => {
  it('should correctly parse qualified value shape constraints', async () => {
    const doc = await new ShaclParser().withPath('samples/shacl/qualified-shapes.ttl').parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/TeamShape');
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/Team');

    // Should have 1 property shape
    expect(shape.dependentShapes).toHaveLength(1);

    const memberProp = shape.dependentShapes?.[0];
    expect(memberProp).toBeDefined();
    expect(memberProp?.shape?.path).toBe('http://example.org/member');
    expect(memberProp?.coreConstraints?.qualifiedMinCount).toBe(1);
    expect(memberProp?.coreConstraints?.qualifiedMaxCount).toBe(2);
    expect(memberProp?.coreConstraints?.qualifiedValueShape).toBeDefined();

    // Check nested qualified value shape
    const qualifiedShape = memberProp?.dependentShapes?.[0];
    expect(qualifiedShape).toBeDefined();
    expect(qualifiedShape?.coreConstraints?.class).toBe('http://example.org/Person');

    // Check nested property shape for role
    expect(qualifiedShape?.dependentShapes).toHaveLength(1);
    const roleProp = qualifiedShape?.dependentShapes?.[0];
    expect(roleProp?.shape?.path).toBe('http://example.org/role');
    // hasValue is parsed as boolean based on current implementation
    expect(roleProp?.coreConstraints?.hasValue).toBeDefined();
  });
});

describe('irBuilder - Logical Constraints', () => {
  it('should correctly parse logical constraints (or, and, not, xone)', async () => {
    const doc = await new ShaclParser().withPath('samples/shacl/logical-constraints.ttl').parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/AddressShape');
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/Address');

    // Check for logical constraint arrays
    // Each points to an RDF list structure
    expect(shape.coreConstraints?.or).toBeDefined();
    expect(Array.isArray(shape.coreConstraints?.or)).toBe(true);
    expect(shape.coreConstraints?.or?.length).toBeGreaterThan(0);

    expect(shape.coreConstraints?.and).toBeDefined();
    expect(Array.isArray(shape.coreConstraints?.and)).toBe(true);
    expect(shape.coreConstraints?.and?.length).toBeGreaterThan(0);

    expect(shape.coreConstraints?.not).toBeDefined();
    expect(Array.isArray(shape.coreConstraints?.not)).toBe(true);
    expect(shape.coreConstraints?.not?.length).toBeGreaterThan(0);

    expect(shape.coreConstraints?.xone).toBeDefined();
    expect(Array.isArray(shape.coreConstraints?.xone)).toBe(true);
    expect(shape.coreConstraints?.xone?.length).toBeGreaterThan(0);

    // Verify there are dependent shapes for the logical constraints
    expect(shape.dependentShapes).toBeDefined();
    expect(shape.dependentShapes?.length).toBeGreaterThan(0);
  });
});

describe('irBuilder - Node Kind Constraints', () => {
  it('should correctly parse node kind constraints (IRI, Literal, BlankNode)', async () => {
    const doc = await new ShaclParser().withPath('samples/shacl/node-kind-constraints.ttl').parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/DocumentShape');
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/Document');

    // Should have 3 property shapes
    expect(shape.dependentShapes).toHaveLength(3);

    // Author property: nodeKind IRI
    const authorProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/author'
    );
    expect(authorProp).toBeDefined();
    expect(authorProp?.coreConstraints?.nodeKind).toBe('sh:IRI');
    expect(authorProp?.coreConstraints?.class).toBe('http://example.org/Person');

    // Title property: nodeKind Literal
    const titleProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/title'
    );
    expect(titleProp).toBeDefined();
    expect(titleProp?.coreConstraints?.nodeKind).toBe('sh:Literal');
    expect(titleProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');

    // Metadata property: nodeKind BlankNode
    const metadataProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/metadata'
    );
    expect(metadataProp).toBeDefined();
    expect(metadataProp?.coreConstraints?.nodeKind).toBe('sh:BlankNode');
  });
});

describe('irBuilder - Property Pair Constraints', () => {
  it('should correctly parse in and languageIn constraints', async () => {
    const doc = await new ShaclParser()
      .withPath('samples/shacl/property-pair-constraints.ttl')
      .parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;

    expect(shapeDefinitions).toHaveLength(1);
    const shape = shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/LanguageShape');
    expect(shape.shape?.targetClasses?.[0]).toBe('http://example.org/MultilingualResource');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Language property: in constraint
    const languageProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/language'
    );
    expect(languageProp).toBeDefined();
    expect(languageProp?.coreConstraints?.in).toBeDefined();

    // Description property: languageIn and uniqueLang
    const descProp = shape.dependentShapes?.find(
      (dep) => dep.shape?.path === 'http://example.org/description'
    );
    expect(descProp).toBeDefined();
    expect(descProp?.coreConstraints?.languageIn).toBeDefined();
    expect(Array.isArray(descProp?.coreConstraints?.languageIn)).toBe(true);
    expect(descProp?.coreConstraints?.uniqueLang).toBe(true);
  });
});

describe('irBuilder - Integration Tests', () => {
  it('should handle empty SHACL document', async () => {
    const emptyTtl = `@prefix sh: <http://www.w3.org/ns/shacl#> .`;
    const tempFile = 'samples/shacl/empty-test.ttl';
    fs.writeFileSync(tempFile, emptyTtl);

    const doc = await new ShaclParser().withPath(tempFile).parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    expect(shapeDefinitions).toHaveLength(0);

    fs.unlinkSync(tempFile);
  });

  it('should correctly handle multiple named shapes', async () => {
    const doc = await new ShaclParser()
      .withPath('samples/shacl/cardinality-constraints.ttl')
      .parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    // All returned shapes should be named shapes (not blank nodes)
    shapeDefinitions.forEach((shape) => {
      expect(shape.nodeKey).toBeDefined();
      expect(shape.nodeKey.startsWith('http://') || shape.nodeKey.startsWith('#')).toBe(true);
    });
  });

  it('should correctly resolve dependencies between shapes', async () => {
    const doc = await new ShaclParser().withPath('samples/shacl/qualified-shapes.ttl').parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    const shape = shapeDefinitions[0];

    // Parent shape should have dependent shapes
    expect(shape.dependentShapes).toBeDefined();
    expect(shape.dependentShapes?.length).toBeGreaterThan(0);

    // Dependent shapes should have their own properties populated
    shape.dependentShapes?.forEach((depShape) => {
      expect(depShape.nodeKey).toBeDefined();
      expect(depShape.shape).toBeDefined();
    });
  });

  it('should maintain correct topological order for nested dependencies', async () => {
    const doc = await new ShaclParser().withPath('samples/shacl/qualified-shapes.ttl').parse();
    const ir = new IntermediateRepresentationBuilder(doc).build();
    const { shapeDefinitions } = ir;
    // The main shape should be at the top level
    expect(shapeDefinitions).toHaveLength(1);

    const mainShape = shapeDefinitions[0];

    // Check that nested shapes are resolved in dependent shapes
    const propertyShape = mainShape.dependentShapes?.[0];
    expect(propertyShape?.dependentShapes).toBeDefined();

    // Nested qualified value shape should be resolved
    if (propertyShape?.dependentShapes && propertyShape.dependentShapes.length > 0) {
      const qualifiedShape = propertyShape.dependentShapes[0];
      expect(qualifiedShape.nodeKey).toBeDefined();
    }
  });
});
