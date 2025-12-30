import { ShaclParser } from '../shacl/shacl-parser';
import { TargetResolver } from './target-resolver';
import { getQuads, getShapes } from './util';
import { Quad_Subject } from 'n3';

async function getShapesAndQuads(content: string) {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  const quads = getQuads(shaclDocument);
  const shapes = getShapes(shaclDocument.subjects);
  return { quads, shapes, shaclDocument };
}

function getKey(shapes: Quad_Subject[], search: string) {
  return [...shapes].filter((shape) => shape.value.endsWith(search));
}

describe('Target Resolver', () => {
  describe('targetClass', () => {
    it('should handle single targetClass declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    # Scenario 1: Single sh:targetClass
    ex:Shape a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
            sh:path ex:name ;
            sh:minCount 1 ;
        ] .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(1);
      const key = getKey(shapes, 'Shape')[0];
      expect(target.get(key)).toEqual(['Person']);
    });

    it('should handle multiple targetClass declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    # Scenario 1: Single sh:targetClass
    ex:Shape a sh:NodeShape ;
        sh:targetClass ex:Employee ;
        sh:targetClass ex:Manager ;
        sh:property [
            sh:path ex:employeeId ;
            sh:minCount 1 ;
        ] .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(1);
      const key = getKey(shapes, 'Shape')[0];
      expect(target.get(key)).toEqual(['Employee', 'Manager']);
    });
  });

  describe('targetNode', () => {
    it('should handle single targetNode declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetNode ex:JohnDoe ;
        sh:property [
            sh:path ex:age ;
            sh:minCount 1 ;
        ] .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(1);
      const key = getKey(shapes, 'Shape')[0];
      expect(target.get(key)).toEqual(['JohnDoe']);
    });

    it('should handle multiple targetNode declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetNode ex:JaneDoe ;
        sh:targetNode ex:BobSmith ;
        sh:property [
            sh:path ex:status ;
            sh:minCount 1 ;
        ] .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(1);
      const key = getKey(shapes, 'Shape')[0];
      expect(target.get(key)).toEqual(['JaneDoe', 'BobSmith']);
    });
  });

  describe('targetSubjectsOf', () => {
    it('should handle single targetSubjectsOf declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetSubjectsOf ex:knows ;
        sh:property [
            sh:path ex:socialScore ;
            sh:minCount 1 ;
        ] .
        
    ex:Alice ex:knows ex:Bob .
    ex:Bob ex:knows ex:Charlie .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(3);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual(['Alice', 'Bob']);

      const alice = getKey(shapes, 'Alice')[0];
      expect(target.get(alice)).toEqual(['Alice']);
      const bob = getKey(shapes, 'Bob')[0];
      expect(target.get(bob)).toEqual(['Bob']);
    });

    it('should handle multiple targetSubjectsOf declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetSubjectsOf ex:likes ;
        sh:targetSubjectsOf ex:follows ;
        sh:property [
            sh:path ex:activityLevel ;
            sh:minCount 1 ;
        ] .
        
    ex:Alice ex:likes ex:Pizza .
    ex:Bob ex:follows ex:Alice .
    ex:Charlie ex:follows ex:Bob .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(4);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual(['Alice', 'Bob', 'Charlie']);

      const alice = getKey(shapes, 'Alice')[0];
      expect(target.get(alice)).toEqual(['Alice']);
      const bob = getKey(shapes, 'Bob')[0];
      expect(target.get(bob)).toEqual(['Bob']);
      const charlie = getKey(shapes, 'Charlie')[0];
      expect(target.get(charlie)).toEqual(['Charlie']);
    });
  });

  describe('targetObjectsOf', () => {
    it('should handle single targetObjectsOf declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetObjectsOf ex:manages ;
        sh:property [
            sh:path ex:departmentId ;
            sh:minCount 1 ;
        ] .
        
    ex:Alice ex:manages ex:TeamA .
    ex:Bob ex:manages ex:TeamB .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(3);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual(['TeamA', 'TeamB']);

      const alice = getKey(shapes, 'Alice')[0];
      expect(target.get(alice)).toEqual(['Alice']);
      const bob = getKey(shapes, 'Bob')[0];
      expect(target.get(bob)).toEqual(['Bob']);
    });

    it('should handle multiple targetObjectsOf declaration', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetObjectsOf ex:reportsto ;
        sh:targetObjectsOf ex:mentors ;
        sh:property [
            sh:path ex:subordinateLevel ;
            sh:minCount 1 ;
        ] .
        
    ex:Charlie ex:reportsto ex:Alice .
    ex:David ex:reportsto ex:Bob .
    ex:Alice ex:mentors ex:David .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(4);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual(['Alice', 'Bob', 'David']);

      const alice = getKey(shapes, 'Alice')[0];
      expect(target.get(alice)).toEqual(['Alice']);
      const bob = getKey(shapes, 'David')[0];
      expect(target.get(bob)).toEqual(['David']);
      const charlie = getKey(shapes, 'Charlie')[0];
      expect(target.get(charlie)).toEqual(['Charlie']);
    });
  });

  describe('all declarations together', () => {
    it('should handle all declarations appearing once', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetClass ex:University ;
        sh:targetNode ex:MIT ;
        sh:targetSubjectsOf ex:graduates ;
        sh:targetObjectsOf ex:accredits ;
        sh:property [
            sh:path ex:ranking ;
            sh:minCount 1 ;
        ] .
        
    ex:MIT ex:graduates ex:Student3 .
    ex:AccreditationBody ex:accredits ex:MIT .
    ex:AccreditationBody ex:accredits ex:University1 .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(3);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual(['University', 'MIT', 'University1']);

      const mit = getKey(shapes, 'MIT')[0];
      expect(target.get(mit)).toEqual(['MIT']);
      const accreditationBody = getKey(shapes, 'AccreditationBody')[0];
      expect(target.get(accreditationBody)).toEqual(['AccreditationBody']);
    });

    it('should handle all declarations appearing multiple times', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetClass ex:ClassA ;
        sh:targetClass ex:ClassB ;
        sh:targetNode ex:Node1 ;
        sh:targetNode ex:Node2 ;
        sh:targetSubjectsOf ex:predA ;
        sh:targetSubjectsOf ex:predB ;
        sh:targetObjectsOf ex:predC ;
        sh:targetObjectsOf ex:predD ;
        sh:property [
            sh:path ex:comprehensive ;
            sh:minCount 1 ;
        ] .
        
    ex:EntityA ex:predA ex:EntityB .
    ex:EntityC ex:predB ex:EntityD .
    ex:EntityE ex:predC ex:EntityF .
    ex:EntityG ex:predD ex:EntityH .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(5);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual([
        'ClassA',
        'ClassB',
        'Node1',
        'Node2',
        'EntityA',
        'EntityC',
        'EntityF',
        'EntityH',
      ]);

      const entityA = getKey(shapes, 'EntityA')[0];
      expect(target.get(entityA)).toEqual(['EntityA']);
      const entityC = getKey(shapes, 'EntityC')[0];
      expect(target.get(entityC)).toEqual(['EntityC']);
    });
  });

  it('should handle duplicates', async () => {
    const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:targetClass ex:Duplicate ;
        sh:targetNode ex:Duplicate ;
        sh:property [
            sh:path ex:dedup ;
            sh:minCount 1 ;
        ] .
    `;
    const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
    const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
    expect(target).toBeDefined();
    expect(target.size).toBe(1);

    const shape = getKey(shapes, 'Shape')[0];
    expect(target.get(shape)).toEqual(['Duplicate']);
  });

  describe('fallback', () => {
    it('should fallback on "Shape" when there is no valid shape name and target declarations', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:Shape a sh:NodeShape ;
        sh:property [
            sh:path ex:value ;
            sh:minCount 1 ;
        ] .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(1);

      const shape = getKey(shapes, 'Shape')[0];
      expect(target.get(shape)).toEqual(['Shape']);
    });

    it('should fallback on stripped shape name when there is valid shape name but no target declarations', async () => {
      const testData = `
    @prefix ex: <http://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:PersonShape a sh:NodeShape ;
        sh:property [
            sh:path ex:value ;
            sh:minCount 1 ;
        ] .
    `;
      const { quads, shapes, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(shapes, quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(1);

      const shape = getKey(shapes, 'PersonShape')[0];
      expect(target.get(shape)).toEqual(['Person']);
    });
  });
});
