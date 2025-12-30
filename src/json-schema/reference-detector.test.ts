import { ReferenceDetector } from './reference-detector';
import { ShapeDefinition } from '../ir/meta-model/shape-definition';
import { SHAPE_TYPE } from '../ir/meta-model/shape';

describe('ReferenceDetector', () => {
  describe('basic construction', () => {
    it('should create detector with empty shape list', () => {
      const detector = new ReferenceDetector([]);
      expect(detector.isReferenced('anyKey')).toBe(false);
    });

    it('should create detector with shapes having no references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/Shape1',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/Shape2',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/Shape1')).toBe(false);
      expect(detector.isReferenced('http://example.org/Shape2')).toBe(false);
    });
  });

  describe('single reference detection', () => {
    it('should detect sh:node reference', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/PersonShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            node: 'http://example.org/AddressShape',
          },
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/AddressShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/AddressShape')).toBe(true);
      expect(detector.isReferenced('http://example.org/PersonShape')).toBe(false);
    });

    it('should detect sh:class reference', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/PropertyShape',
          shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
          coreConstraints: {
            class: 'http://example.org/Organization',
          },
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/Organization',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/Organization')).toBe(true);
      expect(detector.isReferenced('http://example.org/PropertyShape')).toBe(false);
    });

    it('should detect sh:qualifiedValueShape reference', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/ScoreShape',
          shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
          coreConstraints: {
            qualifiedValueShape: 'n3-32',
            qualifiedMinCount: 1,
            qualifiedMaxCount: 10,
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-32')).toBe(true);
      expect(detector.isReferenced('http://example.org/ScoreShape')).toBe(false);
    });

    it('should detect multiple single references from same shape', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/ComplexShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            node: 'http://example.org/NodeShape',
            class: 'http://example.org/Class',
            qualifiedValueShape: 'n3-1',
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/NodeShape')).toBe(true);
      expect(detector.isReferenced('http://example.org/Class')).toBe(true);
      expect(detector.isReferenced('n3-1')).toBe(true);
    });
  });

  describe('array reference detection', () => {
    it('should detect sh:property references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/PersonShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: ['n3-1', 'n3-2', 'n3-3'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('n3-2')).toBe(true);
      expect(detector.isReferenced('n3-3')).toBe(true);
      expect(detector.isReferenced('http://example.org/PersonShape')).toBe(false);
    });

    it('should detect sh:or references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/UnionShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            or: ['n3-10', 'n3-11'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-10')).toBe(true);
      expect(detector.isReferenced('n3-11')).toBe(true);
    });

    it('should detect sh:and references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/IntersectionShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            and: ['n3-20', 'n3-21', 'n3-22'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-20')).toBe(true);
      expect(detector.isReferenced('n3-21')).toBe(true);
      expect(detector.isReferenced('n3-22')).toBe(true);
    });

    it('should detect sh:not references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/NegationShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            not: ['n3-30'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-30')).toBe(true);
    });

    it('should detect sh:xone references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/XoneShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            xone: ['n3-40', 'n3-41'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-40')).toBe(true);
      expect(detector.isReferenced('n3-41')).toBe(true);
    });

    it('should handle empty arrays', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/EmptyArrayShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: [],
            or: [],
            and: [],
            not: [],
            xone: [],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('anything')).toBe(false);
    });

    it('should detect all logical operator references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/LogicalShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            or: ['n3-1', 'n3-2'],
            and: ['n3-3', 'n3-4'],
            not: ['n3-5'],
            xone: ['n3-6', 'n3-7'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('n3-2')).toBe(true);
      expect(detector.isReferenced('n3-3')).toBe(true);
      expect(detector.isReferenced('n3-4')).toBe(true);
      expect(detector.isReferenced('n3-5')).toBe(true);
      expect(detector.isReferenced('n3-6')).toBe(true);
      expect(detector.isReferenced('n3-7')).toBe(true);
    });
  });

  describe('dependent shapes reference detection', () => {
    it('should detect references from dependent shapes', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/ParentShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [
            {
              nodeKey: 'n3-1',
              shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
              coreConstraints: {
                node: 'http://example.org/ReferencedShape',
              },
              dependentShapes: [],
            },
          ],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('http://example.org/ReferencedShape')).toBe(true);
    });

    it('should recursively detect references from nested dependent shapes', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/RootShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [
            {
              nodeKey: 'n3-1',
              shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
              coreConstraints: {},
              dependentShapes: [
                {
                  nodeKey: 'n3-2',
                  shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
                  coreConstraints: {
                    class: 'http://example.org/DeepReference',
                  },
                  dependentShapes: [],
                },
              ],
            },
          ],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('n3-2')).toBe(true);
      expect(detector.isReferenced('http://example.org/DeepReference')).toBe(true);
    });

    it('should handle multiple dependent shapes', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/ParentShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {},
          dependentShapes: [
            {
              nodeKey: 'n3-1',
              shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
              coreConstraints: {
                node: 'http://example.org/Ref1',
              },
              dependentShapes: [],
            },
            {
              nodeKey: 'n3-2',
              shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
              coreConstraints: {
                class: 'http://example.org/Ref2',
              },
              dependentShapes: [],
            },
            {
              nodeKey: 'n3-3',
              shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
              coreConstraints: {
                qualifiedValueShape: 'n3-4',
              },
              dependentShapes: [],
            },
          ],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('n3-2')).toBe(true);
      expect(detector.isReferenced('n3-3')).toBe(true);
      expect(detector.isReferenced('http://example.org/Ref1')).toBe(true);
      expect(detector.isReferenced('http://example.org/Ref2')).toBe(true);
      expect(detector.isReferenced('n3-4')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle shapes without coreConstraints', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/MinimalShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/MinimalShape')).toBe(false);
    });

    it('should handle shapes with undefined coreConstraints', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/UndefinedConstraints',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: undefined,
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('anything')).toBe(false);
    });

    it('should handle shapes without dependentShapes', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/NoDependents',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            node: 'http://example.org/Referenced',
          },
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/Referenced')).toBe(true);
    });

    it('should handle undefined values in constraint arrays', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/Shape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: undefined,
            or: undefined,
            and: undefined,
            not: undefined,
            xone: undefined,
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('anything')).toBe(false);
    });

    it('should handle blank node identifiers', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/Shape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: ['n3-0', 'n3-1', 'n3-100'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-0')).toBe(true);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('n3-100')).toBe(true);
    });

    it('should handle URI references', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/Shape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            class: 'http://xmlns.com/foaf/0.1/Person',
            node: 'http://example.org/OtherShape',
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://xmlns.com/foaf/0.1/Person')).toBe(true);
      expect(detector.isReferenced('http://example.org/OtherShape')).toBe(true);
    });
  });

  describe('multiple shapes scenario', () => {
    it('should detect references across multiple shapes', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/PersonShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: ['n3-1', 'n3-2'],
          },
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/AddressShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: ['n3-3', 'n3-4'],
          },
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/OrganizationShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            class: 'http://example.org/Organization',
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('n3-1')).toBe(true);
      expect(detector.isReferenced('n3-2')).toBe(true);
      expect(detector.isReferenced('n3-3')).toBe(true);
      expect(detector.isReferenced('n3-4')).toBe(true);
      expect(detector.isReferenced('http://example.org/Organization')).toBe(true);
      expect(detector.isReferenced('http://example.org/PersonShape')).toBe(false);
      expect(detector.isReferenced('http://example.org/AddressShape')).toBe(false);
      expect(detector.isReferenced('http://example.org/OrganizationShape')).toBe(false);
    });

    it('should handle same shape referenced multiple times', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/Shape1',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            node: 'http://example.org/CommonShape',
          },
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/Shape2',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            class: 'http://example.org/CommonShape',
          },
          dependentShapes: [],
        },
        {
          nodeKey: 'http://example.org/Shape3',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            property: ['http://example.org/CommonShape'],
          },
          dependentShapes: [],
        },
      ];

      const detector = new ReferenceDetector(shapes);
      expect(detector.isReferenced('http://example.org/CommonShape')).toBe(true);
    });
  });

  describe('complex real-world scenario', () => {
    it('should handle complex shape with all reference types', () => {
      const shapes: ShapeDefinition[] = [
        {
          nodeKey: 'http://example.org/ComplexShape',
          shape: { type: SHAPE_TYPE.NODE_SHAPE },
          coreConstraints: {
            node: 'http://example.org/NodeRef',
            class: 'http://example.org/ClassRef',
            qualifiedValueShape: 'n3-qvs',
            property: ['n3-p1', 'n3-p2', 'n3-p3'],
            or: ['n3-or1', 'n3-or2'],
            and: ['n3-and1'],
            not: ['n3-not1'],
            xone: ['n3-xone1', 'n3-xone2'],
          },
          dependentShapes: [
            {
              nodeKey: 'n3-dep1',
              shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
              coreConstraints: {
                node: 'n3-dep-ref',
              },
              dependentShapes: [
                {
                  nodeKey: 'n3-dep2',
                  shape: { type: SHAPE_TYPE.PROPERTY_SHAPE },
                  coreConstraints: {
                    class: 'http://example.org/DeepRef',
                  },
                  dependentShapes: [],
                },
              ],
            },
          ],
        },
      ];

      const detector = new ReferenceDetector(shapes);

      // Single references
      expect(detector.isReferenced('http://example.org/NodeRef')).toBe(true);
      expect(detector.isReferenced('http://example.org/ClassRef')).toBe(true);
      expect(detector.isReferenced('n3-qvs')).toBe(true);

      // Array references
      expect(detector.isReferenced('n3-p1')).toBe(true);
      expect(detector.isReferenced('n3-p2')).toBe(true);
      expect(detector.isReferenced('n3-p3')).toBe(true);
      expect(detector.isReferenced('n3-or1')).toBe(true);
      expect(detector.isReferenced('n3-or2')).toBe(true);
      expect(detector.isReferenced('n3-and1')).toBe(true);
      expect(detector.isReferenced('n3-not1')).toBe(true);
      expect(detector.isReferenced('n3-xone1')).toBe(true);
      expect(detector.isReferenced('n3-xone2')).toBe(true);

      // Dependent shape references
      expect(detector.isReferenced('n3-dep1')).toBe(true);
      expect(detector.isReferenced('n3-dep-ref')).toBe(true);
      expect(detector.isReferenced('n3-dep2')).toBe(true);
      expect(detector.isReferenced('http://example.org/DeepRef')).toBe(true);

      // Root shape should not be referenced
      expect(detector.isReferenced('http://example.org/ComplexShape')).toBe(false);
    });
  });
});
