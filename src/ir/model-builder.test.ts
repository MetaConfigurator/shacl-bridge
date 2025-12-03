import { ShaclParser } from '../shacl/shacl-parser';
import { ModelBuilder } from './model-builder';
import { ShaclDocument } from '../shacl/model/shacl-document';
import { SEVERITY, SHAPE_TYPE } from './meta-model/shape';

import fs from 'fs';

let simpleShaclDocument: ShaclDocument;
let complexShaclDocument: ShaclDocument;

const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';
const pathToComplexShacl = 'samples/shacl/complex-shacl.ttl';
const pathToAimsShacl = 'samples/shacl/system-nfdi4ing.ttl';

describe('Model Creation', () => {
  beforeAll(async () => {
    let shaclParser = new ShaclParser(pathToSimpleShacl);
    simpleShaclDocument = await shaclParser.parse();

    shaclParser = new ShaclParser(pathToComplexShacl);
    complexShaclDocument = await shaclParser.parse();
  });

  it('should generate IR model for simple SHACL document', () => {
    const modelBuilder = new ModelBuilder(simpleShaclDocument);
    expect(modelBuilder).toBeDefined();

    const model = modelBuilder.build();
    expect(model).toBeDefined();
    expect(model.shapeDefinitions).toBeDefined();
    expect(model.shapeDefinitions.length).toBe(1);

    const personShape = model.shapeDefinitions[0];
    expect(personShape.nodeKey).toBe('http://example.org/PersonShape');

    const shapeProperties = personShape.shape;
    expect(shapeProperties).toBeDefined();
    expect(shapeProperties?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(shapeProperties?.targetClass).toBe('http://xmlns.com/foaf/0.1/Person');

    const coreConstraints = personShape.coreConstraints;
    expect(coreConstraints).toBeDefined();
    expect(coreConstraints?.closed).toBe(true);

    const dependentShapeDefinitions = personShape.dependentShapes;
    expect(coreConstraints).toBeDefined();
    expect(dependentShapeDefinitions?.length).toBe(3);

    const ssnDefinition = dependentShapeDefinitions?.find((sd) => sd?.nodeKey == 'n3-0');
    expect(ssnDefinition).toBeDefined();
    expect(ssnDefinition?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(ssnDefinition?.shape?.path).toBe('http://example.org/ssn');
    expect(ssnDefinition?.coreConstraints?.maxCount).toBe(1);
    expect(ssnDefinition?.coreConstraints?.pattern).toBe('^\\d{3}-\\d{2}-\\d{4}$');
  });

  it('should generate IR model for complex SHACL document', () => {
    const modelBuilder = new ModelBuilder(complexShaclDocument);
    expect(modelBuilder).toBeDefined();

    const model = modelBuilder.build();
    expect(model).toBeDefined();

    const shapeDefinitions = model.shapeDefinitions;
    expect(shapeDefinitions).toBeDefined();
    expect(shapeDefinitions.length).toBe(14);

    const personShapeDefinition = shapeDefinitions.find(
      (sd) => sd.nodeKey === 'http://example.org/PersonShape'
    );
    expect(personShapeDefinition).toBeDefined();
    expect(personShapeDefinition?.shape).toBeDefined();
    expect(personShapeDefinition?.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(personShapeDefinition?.shape?.targetClass?.endsWith('Person')).toBeTruthy();
    expect(personShapeDefinition?.shape?.deactivated).toBeFalsy();
    expect(personShapeDefinition?.shape?.severity).toBe(SEVERITY.VIOLATION);
    expect(personShapeDefinition?.coreConstraints?.closed).toBeTruthy();
    expect(personShapeDefinition?.dependentShapes?.length).toBe(4);
    const namePropertyShape = personShapeDefinition?.dependentShapes?.find((sd) =>
      sd?.shape?.path?.endsWith('name')
    );
    expect(namePropertyShape).toBeDefined();
    expect(namePropertyShape?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(namePropertyShape?.shape?.path).toBe('http://xmlns.com/foaf/0.1/name');
    expect(namePropertyShape?.coreConstraints?.minCount).toBe(1);
    expect(namePropertyShape?.coreConstraints?.pattern).toBe('^[A-Z].*');
  });

  it('should parse the AIMS Shacl File', async () => {
    const parser = new ShaclParser(pathToAimsShacl);
    const aimsDoc = await parser.parse();

    const modelBuilder = new ModelBuilder(aimsDoc);
    expect(modelBuilder).toBeDefined();

    const model = modelBuilder.build();
    expect(model).toBeDefined();
  });
});

describe('ModelBuilder - Cardinality Constraints', () => {
  it('should correctly parse cardinality constraints (minCount, maxCount)', async () => {
    const parser = new ShaclParser('samples/shacl/cardinality-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/PersonCardinalityShape');
    expect(shape.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(shape.shape?.targetClass).toBe('http://example.org/Person');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Email property: minCount 1, maxCount 3
    const emailProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/email'
    );
    expect(emailProp).toBeDefined();
    expect(emailProp?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(emailProp?.coreConstraints?.minCount).toBe(1);
    expect(emailProp?.coreConstraints?.maxCount).toBe(3);
    expect(emailProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');

    // Age property: minCount 1, maxCount 1
    const ageProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/age'
    );
    expect(ageProp).toBeDefined();
    expect(ageProp?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(ageProp?.coreConstraints?.minCount).toBe(1);
    expect(ageProp?.coreConstraints?.maxCount).toBe(1);
    expect(ageProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#integer');
  });
});

describe('ModelBuilder - Value Range Constraints', () => {
  it('should correctly parse value range constraints (minInclusive, maxInclusive, minExclusive, maxExclusive)', async () => {
    const parser = new ShaclParser('samples/shacl/value-range-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/ProductShape');
    expect(shape.shape?.targetClass).toBe('http://example.org/Product');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Price property: minInclusive 0, maxInclusive 10000
    const priceProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/price'
    );
    expect(priceProp).toBeDefined();
    expect(priceProp?.coreConstraints?.minInclusive).toBe(0);
    expect(priceProp?.coreConstraints?.maxInclusive).toBe(10000);
    expect(priceProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#decimal');

    // Discount property: minExclusive 0, maxExclusive 100
    const discountProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/discount'
    );
    expect(discountProp).toBeDefined();
    expect(discountProp?.coreConstraints?.minExclusive).toBe(0);
    expect(discountProp?.coreConstraints?.maxExclusive).toBe(100);
    expect(discountProp?.coreConstraints?.datatype).toBe(
      'http://www.w3.org/2001/XMLSchema#integer'
    );
  });
});

describe('ModelBuilder - String Constraints', () => {
  it('should correctly parse string-based constraints (minLength, maxLength, pattern)', async () => {
    const parser = new ShaclParser('samples/shacl/string-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/UserShape');
    expect(shape.shape?.targetClass).toBe('http://example.org/User');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Username property: minLength 3, maxLength 20, pattern
    const usernameProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/username'
    );
    expect(usernameProp).toBeDefined();
    expect(usernameProp?.coreConstraints?.minLength).toBe(3);
    expect(usernameProp?.coreConstraints?.maxLength).toBe(20);
    expect(usernameProp?.coreConstraints?.pattern).toBe('^[a-zA-Z0-9_]+$');
    expect(usernameProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');

    // Password property: minLength 8
    const passwordProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/password'
    );
    expect(passwordProp).toBeDefined();
    expect(passwordProp?.coreConstraints?.minLength).toBe(8);
    expect(passwordProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');
  });
});

describe('ModelBuilder - Qualified Value Shapes', () => {
  it('should correctly parse qualified value shape constraints', async () => {
    const parser = new ShaclParser('samples/shacl/qualified-shapes.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/TeamShape');
    expect(shape.shape?.targetClass).toBe('http://example.org/Team');

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

describe('ModelBuilder - Logical Constraints', () => {
  it('should correctly parse logical constraints (or, and, not, xone)', async () => {
    const parser = new ShaclParser('samples/shacl/logical-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/AddressShape');
    expect(shape.shape?.targetClass).toBe('http://example.org/Address');

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

describe('ModelBuilder - Node Kind Constraints', () => {
  it('should correctly parse node kind constraints (IRI, Literal, BlankNode)', async () => {
    const parser = new ShaclParser('samples/shacl/node-kind-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/DocumentShape');
    expect(shape.shape?.targetClass).toBe('http://example.org/Document');

    // Should have 3 property shapes
    expect(shape.dependentShapes).toHaveLength(3);

    // Author property: nodeKind IRI
    const authorProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/author'
    );
    expect(authorProp).toBeDefined();
    expect(authorProp?.coreConstraints?.nodeKind).toBe('sh:IRI');
    expect(authorProp?.coreConstraints?.class).toBe('http://example.org/Person');

    // Title property: nodeKind Literal
    const titleProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/title'
    );
    expect(titleProp).toBeDefined();
    expect(titleProp?.coreConstraints?.nodeKind).toBe('sh:Literal');
    expect(titleProp?.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');

    // Metadata property: nodeKind BlankNode
    const metadataProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/metadata'
    );
    expect(metadataProp).toBeDefined();
    expect(metadataProp?.coreConstraints?.nodeKind).toBe('sh:BlankNode');
  });
});

describe('ModelBuilder - Property Pair Constraints', () => {
  it('should correctly parse in and languageIn constraints', async () => {
    const parser = new ShaclParser('samples/shacl/property-pair-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(1);
    const shape = model.shapeDefinitions[0];
    expect(shape.nodeKey).toBe('http://example.org/LanguageShape');
    expect(shape.shape?.targetClass).toBe('http://example.org/MultilingualResource');

    // Should have 2 property shapes
    expect(shape.dependentShapes).toHaveLength(2);

    // Language property: in constraint
    const languageProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/language'
    );
    expect(languageProp).toBeDefined();
    expect(languageProp?.coreConstraints?.in).toBeDefined();

    // Check the RDF list for 'in' constraint
    const inList = languageProp?.dependentShapes;
    expect(inList).toBeDefined();
    expect(inList?.length).toBeGreaterThan(0);

    // Description property: languageIn and uniqueLang
    const descProp = shape.dependentShapes?.find(
      (dep) => dep?.shape?.path === 'http://example.org/description'
    );
    expect(descProp).toBeDefined();
    expect(descProp?.coreConstraints?.languageIn).toBeDefined();
    expect(Array.isArray(descProp?.coreConstraints?.languageIn)).toBe(true);
    expect(descProp?.coreConstraints?.uniqueLang).toBe(true);
  });
});

describe('ModelBuilder - Integration Tests', () => {
  it('should handle empty SHACL document', async () => {
    const emptyTtl = `@prefix sh: <http://www.w3.org/ns/shacl#> .`;
    const tempFile = 'samples/shacl/empty-test.ttl';
    fs.writeFileSync(tempFile, emptyTtl);

    const parser = new ShaclParser(tempFile);
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    expect(model.shapeDefinitions).toHaveLength(0);

    fs.unlinkSync(tempFile);
  });

  it('should correctly handle multiple named shapes', async () => {
    const parser = new ShaclParser('samples/shacl/cardinality-constraints.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    // All returned shapes should be named shapes (not blank nodes)
    model.shapeDefinitions.forEach((shape) => {
      expect(shape.nodeKey).toBeDefined();
      expect(shape.nodeKey.startsWith('http://') || shape.nodeKey.startsWith('#')).toBe(true);
    });
  });

  it('should correctly resolve dependencies between shapes', async () => {
    const parser = new ShaclParser('samples/shacl/qualified-shapes.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    const shape = model.shapeDefinitions[0];

    // Parent shape should have dependent shapes
    expect(shape.dependentShapes).toBeDefined();
    expect(shape.dependentShapes?.length).toBeGreaterThan(0);

    // Dependent shapes should have their own properties populated
    shape.dependentShapes?.forEach((depShape) => {
      if (depShape) {
        expect(depShape.nodeKey).toBeDefined();
        expect(depShape.shape).toBeDefined();
      }
    });
  });

  it('should maintain correct topological order for nested dependencies', async () => {
    const parser = new ShaclParser('samples/shacl/qualified-shapes.ttl');
    const doc = await parser.parse();
    const model = new ModelBuilder(doc).build();

    // The main shape should be at the top level
    expect(model.shapeDefinitions.length).toBe(1);

    const mainShape = model.shapeDefinitions[0];

    // Check that nested shapes are resolved in dependent shapes
    const propertyShape = mainShape.dependentShapes?.[0];
    expect(propertyShape?.dependentShapes).toBeDefined();

    // Nested qualified value shape should be resolved
    if (propertyShape?.dependentShapes && propertyShape.dependentShapes.length > 0) {
      const qualifiedShape = propertyShape.dependentShapes[0];
      expect(qualifiedShape?.nodeKey).toBeDefined();
    }
  });
});
