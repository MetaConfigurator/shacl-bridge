import { ShaclParser } from '../shacl/shacl-parser';
import { ModelBuilder } from './model';
import { ShaclDocument } from '../shacl/model/shacl-document';

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

    const idMappings = modelBuilder.getIdMappings;
    expect(idMappings).toBeDefined();
    expect(idMappings.size).toBe(3);
    expect(idMappings.get('n3-0')).toStrictEqual({
      n3Node: 'n3-0',
      shape: 'http://example.org/PersonShape',
      property: 'http://example.org/ssn',
    });

    const model = modelBuilder.build();
    expect(model).toBeDefined();

    const shapeDefinitions = model.shapeDefinitions;
    expect(shapeDefinitions.length).toBe(1);

    const personShapeDefinition = shapeDefinitions[0];
    expect(personShapeDefinition.properties?.length).toBe(4);
    expect(personShapeDefinition.nodeKey).toContain('PersonShape');
    expect(personShapeDefinition.targetClass).toContain('http://xmlns.com/foaf/0.1/Person');
    expect(personShapeDefinition.closed).toBe(true);

    const ssnShapeDefinition = personShapeDefinition.properties?.[0];
    expect(ssnShapeDefinition?.nodeKey).toContain('ssn');
    expect(ssnShapeDefinition?.maxCount).toBe(1);

    const worksForShapeDefinition = personShapeDefinition.properties?.[1];
    expect(worksForShapeDefinition?.nodeKey).toContain('worksFor');
    expect(worksForShapeDefinition?.nodeKind).toContain('IRI');
  });

  it('should generate IR model for complex SHACL document', () => {
    const modelBuilder = new ModelBuilder(complexShaclDocument);
    expect(modelBuilder).toBeDefined();

    const idMappings = modelBuilder.getIdMappings;
    expect(idMappings).toBeDefined();
    expect(idMappings.size).toBe(46);
    expect(idMappings.get('n3-3')).toStrictEqual({
      n3Node: 'n3-3',
      shape: 'http://example.org/PersonShape',
      property: 'http://xmlns.com/foaf/0.1/name',
    });
    // There are 21 properties which are sh:path in the complex SHACL document.
    expect([...idMappings.values()].filter((value) => value.property != null).length).toBe(21);

    const model = modelBuilder.build();
    expect(model).toBeDefined();

    const shapeDefinitions = model.shapeDefinitions;
    expect(shapeDefinitions.length).toBe(14);
    expect(shapeDefinitions.map((sd) => sd.nodeKey)).toStrictEqual([
      '#shapesGraph',
      'http://example.org/PersonShape',
      'http://example.org/CountryCodeShape',
      'http://example.org/IdentifierShape',
      'http://example.org/ScoresShape',
      'http://example.org/NoOrphanAddress',
      'http://example.org/AddressInferenceShape',
      '#SPARQLTargetShape',
      'http://example.org/DeprecatedPropertyShape',
      'http://example.org/CompanyShape',
      'http://example.org/ProductShape',
      'http://example.org/SampleSeverityShape',
      '#composedShape',
      'http://example.org/LabelLanguageShape',
    ]);
  });
});
