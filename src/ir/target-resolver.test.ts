import { ShaclParser } from '../shacl/parser/shacl-parser';
import { TargetResolver } from './target-resolver';
import { getQuads, getShapes } from './util';

async function getShapesAndQuads(content: string) {
  const shaclDocument = await new ShaclParser().withContent(content).parse();
  const quads = getQuads(shaclDocument);
  const shapes = getShapes(shaclDocument);
  return { quads, shapes, shaclDocument };
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(2);
      expect([...target.values()].flat(1).sort()).toEqual(['Person', 'name'].sort());
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(2);
      expect([...target.values()].flat(1).sort()).toEqual(
        ['Employee', 'Manager', 'employeeId'].sort()
      );
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(2);
      expect([...target.values()].flat(1).sort()).toEqual(['JohnDoe', 'age'].sort());
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(2);
      expect([...target.values()].flat(1).sort()).toEqual(['JaneDoe', 'BobSmith', 'status'].sort());
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(4);
      expect([...target.values()].flat(1).sort()).toEqual(
        ['Alice', 'Bob', 'socialScore', 'Alice', 'Bob'].sort()
      );
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(5);
      expect([...target.values()].flat(1).sort()).toEqual(
        ['Alice', 'Alice', 'Bob', 'Bob', 'Charlie', 'Charlie', 'activityLevel'].sort()
      );
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(4);
      expect([...target.values()].flat(1).sort()).toEqual(
        ['TeamA', 'TeamB', 'departmentId', 'Alice', 'Bob'].sort()
      );
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(5);
      expect([...target.values()].flat(1).sort()).toStrictEqual(
        ['Alice', 'Bob', 'David', 'subordinateLevel', 'Charlie', 'Alice', 'David'].sort()
      );
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(4);
      expect([...target.values()].flat(1).sort()).toEqual(
        [
          'University',
          'MIT',
          'University1',
          'MIT', // for MIT node
          'ranking',
          'AccreditationBody',
        ].sort()
      );
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(6);
      expect([...target.values()].flat(1).sort()).toEqual(
        [
          'ClassA',
          'ClassB',
          'Node1',
          'Node2',
          'EntityA',
          'EntityC',
          'EntityF',
          'EntityH',
          'comprehensive',
          'EntityA',
          'EntityC',
          'EntityE',
          'EntityG',
        ].sort()
      );
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
    const { quads, shaclDocument } = await getShapesAndQuads(testData);
    const target = new TargetResolver(shaclDocument).resolveTargets(quads);
    expect(target).toBeDefined();
    expect(target.size).toBe(2);
    expect([...target.values()].flat(1).sort()).toEqual(['Duplicate', 'dedup'].sort());
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(2);
      expect([...target.values()].flat(1).sort()).toEqual(['Shape', 'value'].sort());
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
      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(2);
      expect([...target.values()].flat(1).sort()).toEqual(['Person', 'value'].sort());
    });
  });

  describe('Real-World File', () => {
    it('should get targets for all', async () => {
      const testData = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      
      ex:PersonShape
          a sh:NodeShape ;
          sh:targetClass ex:Person ;
          sh:property [
              sh:path ex:name ;
              sh:datatype xsd:string ;
              sh:minCount 1 ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:email ;
              sh:datatype xsd:string ;
              sh:pattern "^[\\\\w.-]+@[\\\\w.-]+\\\\.\\\\w+$" ;
              sh:maxCount 1 ;
          ] ;
          sh:property [
              sh:path ex:age ;
              sh:datatype xsd:integer ;
              sh:minInclusive 0 ;
              sh:maxInclusive 150 ;
              sh:maxCount 1 ;
          ] .
    `;

      const { quads, shaclDocument } = await getShapesAndQuads(testData);
      const target = new TargetResolver(shaclDocument).resolveTargets(quads);
      expect(target).toBeDefined();
      expect(target.size).toBe(4);
      expect([...target.values()].flat(1).sort()).toEqual(
        ['Person', 'name', 'email', 'age'].sort()
      );
    });
  });
});
