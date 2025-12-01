import { ShaclParser } from '../shacl/shacl-parser';
import { ModelBuilder } from './model-builder';
import { ShaclDocument } from '../shacl/model/shacl-document';
import { SHAPE_TYPE } from './meta-model/shape';

let simpleShaclDocument: ShaclDocument;
let complexShaclDocument: ShaclDocument;

const pathToSimpleShacl = 'samples/shacl/simple-shacl.ttl';
const pathToComplexShacl = 'samples/shacl/complex-shacl.ttl';

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
    // TODO: Node Shape
    expect(shapeProperties?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    expect(shapeProperties?.targetClass).toBe('http://xmlns.com/foaf/0.1/Person');

    const coreConstraints = personShape.coreConstraints;
    expect(coreConstraints).toBeDefined();
    expect(coreConstraints?.closed).toBe(true);

    const dependentShapeDefinitions = personShape.dependentShapes;
    expect(coreConstraints).toBeDefined();
    expect(dependentShapeDefinitions?.length).toBe(3);

    const ssnDefinition = dependentShapeDefinitions?.find((sd) => sd.nodeKey == 'n3-0');
    expect(ssnDefinition).toBeDefined();
    expect(ssnDefinition?.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    expect(ssnDefinition?.shape?.path).toBe('http://example.org/ssn');
    expect(ssnDefinition?.coreConstraints?.maxCount).toBe(1);
    expect(ssnDefinition?.coreConstraints?.pattern).toBe('^\\d{3}-\\d{2}-\\d{4}$');
  });

  it('should generate IR model for complex SHACL document', () => {
    // TODO: Add cases for complex SHACL document after confirming assertions
    const modelBuilder = new ModelBuilder(complexShaclDocument);
    expect(modelBuilder).toBeDefined();

    // const idMappings = modelBuilder.idMappings;
    // expect(idMappings).toBeDefined();
    // expect(idMappings.size).toBe(46);
    // expect(idMappings.get('n3-3')).toStrictEqual({
    //   n3Node: 'n3-3',
    //   shape: 'http://example.org/PersonShape',
    //   property: 'http://xmlns.com/foaf/0.1/name',
    // });
    // // There are 21 properties which are sh:path in the complex SHACL document.
    // expect([...idMappings.values()].filter((value) => value.property != null).length).toBe(21);

    const model = modelBuilder.build();
    expect(model).toBeDefined();

    // const shapeDefinitions = model.shapeDefinitions;
    // expect(shapeDefinitions.length).toBe(14);
    // expect(shapeDefinitions.map((sd) => sd.nodeKey)).toStrictEqual([
    //   '#shapesGraph',
    //   'http://example.org/PersonShape',
    //   'http://example.org/CountryCodeShape',
    //   'http://example.org/IdentifierShape',
    //   'http://example.org/ScoresShape',
    //   'http://example.org/NoOrphanAddress',
    //   'http://example.org/AddressInferenceShape',
    //   '#SPARQLTargetShape',
    //   'http://example.org/DeprecatedPropertyShape',
    //   'http://example.org/CompanyShape',
    //   'http://example.org/ProductShape',
    //   'http://example.org/SampleSeverityShape',
    //   '#composedShape',
    //   'http://example.org/LabelLanguageShape',
    // ]);
  });
});
