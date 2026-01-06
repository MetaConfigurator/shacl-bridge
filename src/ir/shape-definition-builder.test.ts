import { ShapeDefinitionBuilder } from './shape-definition-builder';
import { SEVERITY, SHAPE_TYPE } from './meta-model/shape';
import { NodeKind } from './meta-model/node-kind';
import { DataFactory, Term } from 'n3';

describe('ShapeDefinitionBuilder', () => {
  describe('basic construction', () => {
    it('should create a builder with nodeKey', () => {
      const builder = new ShapeDefinitionBuilder('http://example.org/PersonShape');
      const result = builder.build();

      expect(result.nodeKey).toBe('http://example.org/PersonShape');
      expect(result.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE); // default type
      expect(result.coreConstraints).toEqual({});
      expect(result.dependentShapes).toEqual([]);
    });

    it('should support method chaining', () => {
      const builder = new ShapeDefinitionBuilder('http://example.org/PersonShape');
      const result = builder
        .setType('http://www.w3.org/ns/shacl#NodeShape')
        .setTargetClass('http://xmlns.com/foaf/0.1/Person')
        .setMessage('Test message')
        .build();

      expect(result.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
      expect(result.shape?.targetClasses?.[0]).toBe('http://xmlns.com/foaf/0.1/Person');
      expect(result.shape?.message).toBe('Test message');
    });
  });

  describe('setType', () => {
    it('should set type to NodeShape when URI ends with NodeShape', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setType('http://www.w3.org/ns/shacl#NodeShape');
      const result = builder.build();

      expect(result.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    });

    it('should set type to PropertyShape when URI ends with PropertyShape', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setType('http://www.w3.org/ns/shacl#PropertyShape');
      const result = builder.build();

      expect(result.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    });

    it('should handle different namespace prefixes', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setType('http://example.org/custom#NodeShape');
      const result = builder.build();

      expect(result.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
    });
  });

  describe('setPath', () => {
    it('should set path and automatically set type to PropertyShape', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setPath('http://xmlns.com/foaf/0.1/name');
      const result = builder.build();

      expect(result.shape?.path).toBe('http://xmlns.com/foaf/0.1/name');
      expect(result.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
    });
  });

  describe('setTargetClass', () => {
    it('should set target class', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setTargetClass('http://xmlns.com/foaf/0.1/Person');
      const result = builder.build();

      expect(result.shape?.targetClasses?.[0]).toBe('http://xmlns.com/foaf/0.1/Person');
    });
  });

  describe('setDeactivated', () => {
    it('should set deactivated to true when value ends with "true"', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setDeactivated('http://www.w3.org/2001/XMLSchema#true');
      const result = builder.build();

      expect(result.shape?.deactivated).toBe(true);
    });

    it('should set deactivated to false when value does not end with "true"', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setDeactivated('http://www.w3.org/2001/XMLSchema#false');
      const result = builder.build();

      expect(result.shape?.deactivated).toBe(false);
    });

    it('should handle plain string "true"', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setDeactivated('true');
      const result = builder.build();

      expect(result.shape?.deactivated).toBe(true);
    });
  });

  describe('setTargetNode', () => {
    it('should set target node', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setTargetNode('http://example.org/specificNode');
      const result = builder.build();

      expect(result.shape?.targetNodes?.[0]).toBe('http://example.org/specificNode');
    });
  });

  describe('setMessage', () => {
    it('should set validation message', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMessage('Value must be provided');
      const result = builder.build();

      expect(result.shape?.message).toBe('Value must be provided');
    });
  });

  describe('setSeverity', () => {
    it('should set severity to VIOLATION when URI ends with Violation', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setSeverity('http://www.w3.org/ns/shacl#Violation');
      const result = builder.build();

      expect(result.shape?.severity).toBe(SEVERITY.VIOLATION);
    });

    it('should set severity to WARNING when URI ends with Warning', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setSeverity('http://www.w3.org/ns/shacl#Warning');
      const result = builder.build();

      expect(result.shape?.severity).toBe(SEVERITY.WARNING);
    });

    it('should set severity to INFO when URI ends with Info', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setSeverity('http://www.w3.org/ns/shacl#Info');
      const result = builder.build();

      expect(result.shape?.severity).toBe(SEVERITY.INFO);
    });
  });

  describe('cardinality constraints', () => {
    it('should set minCount', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMinCount('1');
      const result = builder.build();

      expect(result.coreConstraints?.minCount).toBe(1);
    });

    it('should set maxCount', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMaxCount('5');
      const result = builder.build();

      expect(result.coreConstraints?.maxCount).toBe(5);
    });

    it('should set both minCount and maxCount', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMinCount('1').setMaxCount('1');
      const result = builder.build();

      expect(result.coreConstraints?.minCount).toBe(1);
      expect(result.coreConstraints?.maxCount).toBe(1);
    });
  });

  describe('range constraints', () => {
    it('should set minInclusive', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMinInclusive('0');
      const result = builder.build();

      expect(result.coreConstraints?.minInclusive).toBe(0);
    });

    it('should set maxInclusive', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMaxInclusive('100');
      const result = builder.build();

      expect(result.coreConstraints?.maxInclusive).toBe(100);
    });

    it('should set minExclusive', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMinExclusive('0');
      const result = builder.build();

      expect(result.coreConstraints?.minExclusive).toBe(0);
    });

    it('should set maxExclusive', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMaxExclusive('100');
      const result = builder.build();

      expect(result.coreConstraints?.maxExclusive).toBe(100);
    });

    it('should set inclusive and exclusive range constraints together', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMinInclusive('0').setMaxExclusive('100');
      const result = builder.build();

      expect(result.coreConstraints?.minInclusive).toBe(0);
      expect(result.coreConstraints?.maxExclusive).toBe(100);
    });
  });

  describe('string constraints', () => {
    it('should set minLength', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMinLength('3');
      const result = builder.build();

      expect(result.coreConstraints?.minLength).toBe(3);
    });

    it('should set maxLength', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setMaxLength('50');
      const result = builder.build();

      expect(result.coreConstraints?.maxLength).toBe(50);
    });

    it('should set pattern', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setPattern('^[A-Z].*');
      const result = builder.build();

      expect(result.coreConstraints?.pattern).toBe('^[A-Z].*');
    });

    it('should set uniqueLang to true', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setUniqueLang('true');
      const result = builder.build();

      expect(result.coreConstraints?.uniqueLang).toBe(true);
    });

    it('should set uniqueLang to false', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setUniqueLang('false');
      const result = builder.build();

      expect(result.coreConstraints?.uniqueLang).toBe(false);
    });
  });

  describe('qualified value constraints', () => {
    it('should set qualifiedMinCount', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setQualifiedMinCount('1');
      const result = builder.build();

      expect(result.coreConstraints?.qualifiedMinCount).toBe(1);
    });

    it('should set qualifiedMaxCount', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setQualifiedMaxCount('10');
      const result = builder.build();

      expect(result.coreConstraints?.qualifiedMaxCount).toBe(10);
    });

    it('should set qualifiedValueShape', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setQualifiedValueShape('n3-32');
      const result = builder.build();

      expect(result.coreConstraints?.qualifiedValueShape).toBe('n3-32');
    });
  });

  describe('setClass', () => {
    it('should set class constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setClass('http://example.org/Organization');
      const result = builder.build();

      expect(result.coreConstraints?.class).toBe('http://example.org/Organization');
    });
  });

  describe('setNodeKind', () => {
    it('should set nodeKind to BlankNode', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setNodeKind('http://www.w3.org/ns/shacl#BlankNode');
      const result = builder.build();

      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.BLANK_NODE);
    });

    it('should set nodeKind to BlankNodeOrIRI', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setNodeKind('http://www.w3.org/ns/shacl#BlankNodeOrIRI');
      const result = builder.build();

      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.BLANK_NODE_OR_IRI);
    });

    it('should set nodeKind to BlankNodeOrLiteral', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setNodeKind('http://www.w3.org/ns/shacl#BlankNodeOrLiteral');
      const result = builder.build();

      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.BLANK_NODE_OR_LITERAL);
    });

    it('should set nodeKind to IRI', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setNodeKind('http://www.w3.org/ns/shacl#IRI');
      const result = builder.build();

      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.IRI);
    });

    it('should set nodeKind to IRIOrLiteral', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setNodeKind('http://www.w3.org/ns/shacl#IRIOrLiteral');
      const result = builder.build();

      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.IRI_OR_LITERAL);
    });

    it('should set nodeKind to Literal', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setNodeKind('http://www.w3.org/ns/shacl#Literal');
      const result = builder.build();

      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.LITERAL);
    });
  });

  describe('setClosed', () => {
    it('should set closed to true', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setClosed('true');
      const result = builder.build();

      expect(result.coreConstraints?.closed).toBe(true);
    });

    it('should set closed to false', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setClosed('false');
      const result = builder.build();

      expect(result.coreConstraints?.closed).toBe(false);
    });
  });

  describe('setDatatype', () => {
    it('should set datatype', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setDatatype('http://www.w3.org/2001/XMLSchema#string');
      const result = builder.build();

      expect(result.coreConstraints?.datatype).toBe('http://www.w3.org/2001/XMLSchema#string');
    });
  });

  describe('setHasValue', () => {
    it('should set hasValue to true', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setHasValue('true');
      const result = builder.build();

      expect(result.coreConstraints?.hasValue).toBe(true);
    });

    it('should set hasValue to false', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setHasValue('false');
      const result = builder.build();

      expect(result.coreConstraints?.hasValue).toBe(false);
    });
  });

  describe('RDF list constraints', () => {
    it('should set first', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setFirst('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
      const result = builder.build();

      expect(result.coreConstraints?.first).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    });

    it('should set rest', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setRest('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
      const result = builder.build();

      expect(result.coreConstraints?.rest).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
    });

    it('should set both first and rest', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setFirst('DE').setRest('n3-9');
      const result = builder.build();

      expect(result.coreConstraints?.first).toBe('DE');
      expect(result.coreConstraints?.rest).toBe('n3-9');
    });
  });

  describe('array-based constraints', () => {
    it('should add single ignored property', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        value1: [DataFactory.blankNode('value1')],
        value2: [DataFactory.blankNode('value2')],
        value3: [DataFactory.blankNode('value3')],
      };
      builder.setIgnoredProperties('value1', lists);
      const result = builder.build();

      expect(result.coreConstraints?.ignoredProperties).toEqual(['value1']);
    });

    it('should add multiple ignored properties', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        value1: [DataFactory.blankNode('value1')],
        value2: [DataFactory.blankNode('value2')],
        value3: [DataFactory.blankNode('value3')],
      };
      builder.setIgnoredProperties('value1', lists).setIgnoredProperties('value2', lists);
      const result = builder.build();

      expect(result.coreConstraints?.ignoredProperties).toEqual(['value1', 'value2']);
    });

    it('should add single property', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setProperty('n3-3');
      const result = builder.build();

      expect(result.coreConstraints?.property).toEqual(['n3-3']);
    });

    it('should add multiple properties', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setProperty('n3-3').setProperty('n3-4').setProperty('n3-5');
      const result = builder.build();

      expect(result.coreConstraints?.property).toEqual(['n3-3', 'n3-4', 'n3-5']);
    });

    it('should add values to in constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.in('n3-8', {
        'n3-8': [DataFactory.blankNode('n3-8')],
      });
      const result = builder.build();

      expect(result.coreConstraints?.in).toEqual(['n3-8']);
    });

    it('should add multiple values to in constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        value1: [DataFactory.blankNode('value1')],
        value2: [DataFactory.blankNode('value2')],
        value3: [DataFactory.blankNode('value3')],
      };
      builder.in('value1', lists).in('value2', lists).in('value3', lists);
      const result = builder.build();

      expect(result.coreConstraints?.in).toEqual(['value1', 'value2', 'value3']);
    });
  });

  describe('logical constraints', () => {
    it('should add or constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.or('n3-14', {
        'n3-14': [DataFactory.blankNode('n3-14')],
      });
      const result = builder.build();

      expect(result.coreConstraints?.or).toEqual(['n3-14']);
    });

    it('should add multiple or constraints', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        'n3-14': [DataFactory.blankNode('n3-14')],
        'n3-15': [DataFactory.blankNode('n3-15')],
      };
      builder.or('n3-14', lists).or('n3-15', lists);
      const result = builder.build();

      expect(result.coreConstraints?.or).toEqual(['n3-14', 'n3-15']);
    });

    it('should add and constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.and('n3-20', {
        'n3-20': [DataFactory.blankNode('n3-20')],
      });
      const result = builder.build();

      expect(result.coreConstraints?.and).toEqual(['n3-20']);
    });

    it('should add multiple and constraints', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        'n3-20': [DataFactory.blankNode('n3-20')],
        'n3-21': [DataFactory.blankNode('n3-21')],
      };
      builder.and('n3-20', lists).and('n3-21', lists);
      const result = builder.build();

      expect(result.coreConstraints?.and).toEqual(['n3-20', 'n3-21']);
    });

    it('should add not constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.not('n3-23', {
        'n3-23': [DataFactory.blankNode('n3-23')],
      });
      const result = builder.build();

      expect(result.coreConstraints?.not).toEqual(['n3-23']);
    });

    it('should add multiple not constraints', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        'n3-23': [DataFactory.blankNode('n3-23')],
        'n3-24': [DataFactory.blankNode('n3-24')],
      };
      builder.not('n3-23', lists).not('n3-24', lists);
      const result = builder.build();

      expect(result.coreConstraints?.not).toEqual(['n3-23', 'n3-24']);
    });

    it('should add xone constraint', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.xone('n3-25', {
        'n3-25': [DataFactory.blankNode('n3-25')],
      });
      const result = builder.build();

      expect(result.coreConstraints?.xone).toEqual(['n3-25']);
    });

    it('should add multiple xone constraints', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        'n3-25': [DataFactory.blankNode('n3-25')],
        'n3-26': [DataFactory.blankNode('n3-26')],
      };
      builder.xone('n3-25', lists).xone('n3-26', lists);
      const result = builder.build();

      expect(result.coreConstraints?.xone).toEqual(['n3-25', 'n3-26']);
    });

    it('should handle complex logical combinations', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        'n3-1': [DataFactory.blankNode('n3-1')],
        'n3-2': [DataFactory.blankNode('n3-2')],
        'n3-3': [DataFactory.blankNode('n3-3')],
        'n3-4': [DataFactory.blankNode('n3-4')],
        'n3-5': [DataFactory.blankNode('n3-5')],
        'n3-6': [DataFactory.blankNode('n3-6')],
      };
      builder
        .or('n3-1', lists)
        .or('n3-2', lists)
        .and('n3-3', lists)
        .not('n3-4', lists)
        .xone('n3-5', lists);
      const result = builder.build();

      expect(result.coreConstraints?.or).toEqual(['n3-1', 'n3-2']);
      expect(result.coreConstraints?.and).toEqual(['n3-3']);
      expect(result.coreConstraints?.not).toEqual(['n3-4']);
      expect(result.coreConstraints?.xone).toEqual(['n3-5']);
    });
  });

  describe('setLanguageIn', () => {
    it('should add single language', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setLanguageIn('n3-47', {
        'n3-47': [DataFactory.blankNode('n3-47')],
      });
      const result = builder.build();

      expect(result.coreConstraints?.languageIn).toEqual(['n3-47']);
    });

    it('should add multiple languages', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const lists = {
        'n3-47': [DataFactory.blankNode('n3-47')],
        'n3-48': [DataFactory.blankNode('n3-48')],
      };
      builder.setLanguageIn('n3-47', lists).setLanguageIn('n3-48', lists);
      const result = builder.build();

      expect(result.coreConstraints?.languageIn).toEqual(['n3-47', 'n3-48']);
    });
  });

  describe('setDependentShapeDefinition', () => {
    it('should add single dependent shape definition', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const dependentShape = new ShapeDefinitionBuilder('n3-1')
        .setType(SHAPE_TYPE.PROPERTY_SHAPE)
        .build();
      builder.setDependentShapeDefinition(dependentShape);
      const result = builder.build();

      expect(result.dependentShapes).toHaveLength(1);
      expect(result.dependentShapes?.[0]).toBe(dependentShape);
    });

    it('should add multiple dependent shape definitions', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const dependent1 = new ShapeDefinitionBuilder('n3-1')
        .setType(SHAPE_TYPE.PROPERTY_SHAPE)
        .build();
      const dependent2 = new ShapeDefinitionBuilder('n3-2')
        .setType(SHAPE_TYPE.PROPERTY_SHAPE)
        .build();
      builder.setDependentShapeDefinition(dependent1).setDependentShapeDefinition(dependent2);
      const result = builder.build();

      expect(result.dependentShapes).toHaveLength(2);
      expect(result.dependentShapes?.[0]).toBe(dependent1);
      expect(result.dependentShapes?.[1]).toBe(dependent2);
    });
  });

  describe('complex shape building', () => {
    it('should build a complete PersonShape with multiple constraints', () => {
      const builder = new ShapeDefinitionBuilder('http://example.org/PersonShape');
      const lists = {
        value1: [DataFactory.blankNode('value1')],
        value2: [DataFactory.blankNode('value2')],
        value3: [DataFactory.blankNode('value3')],
      };
      const result = builder
        .setType('http://www.w3.org/ns/shacl#NodeShape')
        .setTargetClass('http://xmlns.com/foaf/0.1/Person')
        .setMessage('Person shape violation')
        .setSeverity('http://www.w3.org/ns/shacl#Violation')
        .setDeactivated('false')
        .setProperty('n3-3')
        .setProperty('n3-4')
        .setProperty('n3-5')
        .setClosed('true')
        .setIgnoredProperties('value1', lists)
        .build();

      expect(result.nodeKey).toBe('http://example.org/PersonShape');
      expect(result.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
      expect(result.shape?.targetClasses?.[0]).toBe('http://xmlns.com/foaf/0.1/Person');
      expect(result.shape?.message).toBe('Person shape violation');
      expect(result.shape?.severity).toBe(SEVERITY.VIOLATION);
      expect(result.shape?.deactivated).toBe(false);
      expect(result.coreConstraints?.property).toEqual(['n3-3', 'n3-4', 'n3-5']);
      expect(result.coreConstraints?.closed).toBe(true);
      expect(result.coreConstraints?.ignoredProperties).toEqual(['value1']);
    });

    it('should build a PropertyShape with string constraints', () => {
      const builder = new ShapeDefinitionBuilder('n3-3');
      const result = builder
        .setPath('http://xmlns.com/foaf/0.1/name')
        .setMessage('Name must start with a capital letter and be a string.')
        .setMinCount('1')
        .setPattern('^[A-Z].*')
        .build();

      expect(result.nodeKey).toBe('n3-3');
      expect(result.shape?.type).toBe(SHAPE_TYPE.PROPERTY_SHAPE);
      expect(result.shape?.path).toBe('http://xmlns.com/foaf/0.1/name');
      expect(result.shape?.message).toBe('Name must start with a capital letter and be a string.');
      expect(result.coreConstraints?.minCount).toBe(1);
      expect(result.coreConstraints?.pattern).toBe('^[A-Z].*');
    });

    it('should build a PropertyShape with range constraints', () => {
      const builder = new ShapeDefinitionBuilder('n3-4');
      const result = builder
        .setPath('http://xmlns.com/foaf/0.1/age')
        .setMessage('Age should be an integer between 0 and 150.')
        .setMinCount('1')
        .setMinInclusive('0')
        .setMaxInclusive('150')
        .build();

      expect(result.shape?.path).toBe('http://xmlns.com/foaf/0.1/age');
      expect(result.coreConstraints?.minCount).toBe(1);
      expect(result.coreConstraints?.minInclusive).toBe(0);
      expect(result.coreConstraints?.maxInclusive).toBe(150);
    });

    it('should build a shape with nodeKind and class constraints', () => {
      const builder = new ShapeDefinitionBuilder('n3-41');
      const result = builder
        .setPath('http://example.org/manufacturer')
        .setNodeKind('http://www.w3.org/ns/shacl#IRI')
        .setClass('http://example.org/Organization')
        .build();

      expect(result.shape?.path).toBe('http://example.org/manufacturer');
      expect(result.coreConstraints?.nodeKind).toBe(NodeKind.IRI);
      expect(result.coreConstraints?.class).toBe('http://example.org/Organization');
    });

    it('should build a shape with qualified value constraints', () => {
      const builder = new ShapeDefinitionBuilder('n3-31');
      const result = builder
        .setPath('http://example.org/score')
        .setMessage('Scores must be decimals between 0 and 100; between 1 and 10 entries.')
        .setQualifiedValueShape('n3-32')
        .setQualifiedMinCount('1')
        .setQualifiedMaxCount('10')
        .build();

      expect(result.coreConstraints?.qualifiedValueShape).toBe('n3-32');
      expect(result.coreConstraints?.qualifiedMinCount).toBe(1);
      expect(result.coreConstraints?.qualifiedMaxCount).toBe(10);
    });

    it('should build a shape with logical constraints', () => {
      const builder = new ShapeDefinitionBuilder('http://example.org/IdentifierShape');
      const lists = {
        'n3-14': [DataFactory.blankNode('n3-14')],
        'n3-20': [DataFactory.blankNode('n3-20')],
        'n3-23': [DataFactory.blankNode('n3-23')],
        'n3-25': [DataFactory.blankNode('n3-25')],
      };
      const result = builder
        .setTargetClass('http://example.org/IdentifiableEntity')
        .or('n3-14', lists)
        .and('n3-20', lists)
        .not('n3-23', lists)
        .xone('n3-25', lists)
        .build();

      expect(result.shape?.targetClasses?.[0]).toBe('http://example.org/IdentifiableEntity');
      expect(result.coreConstraints?.or).toEqual(['n3-14']);
      expect(result.coreConstraints?.and).toEqual(['n3-20']);
      expect(result.coreConstraints?.not).toEqual(['n3-23']);
      expect(result.coreConstraints?.xone).toEqual(['n3-25']);
    });

    it('should build an RDF list node', () => {
      const builder = new ShapeDefinitionBuilder('n3-8');
      const result = builder.setFirst('DE').setRest('n3-9').build();

      expect(result.nodeKey).toBe('n3-8');
      expect(result.coreConstraints?.first).toBe('DE');
      expect(result.coreConstraints?.rest).toBe('n3-9');
    });
  });

  describe('setAdditionalProperty', () => {
    it('should capture a plain literal value', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const literalTerm = {
        termType: 'Literal',
        value: '2022-04-07',
        datatype: { value: 'http://www.w3.org/2001/XMLSchema#date' },
      };

      builder.setAdditionalProperty('http://purl.org/dc/terms/created', literalTerm as Term);
      const result = builder.build();

      expect(result.additionalProperties).toBeDefined();
      expect(result.additionalProperties).toHaveLength(1);
      expect(result.additionalProperties).toStrictEqual([
        {
          predicate: 'http://purl.org/dc/terms/created',
          value: {
            type: 'literal',
            value: '2022-04-07',
            datatype: 'http://www.w3.org/2001/XMLSchema#date',
          },
        },
      ]);
    });

    it('should capture a language-tagged string', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const langStringTerm = {
        termType: 'Literal',
        value: 'A System is a unit of abstraction',
        language: 'en',
        datatype: { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
      };

      builder.setAdditionalProperty('http://purl.org/dc/terms/description', langStringTerm as Term);
      const result = builder.build();

      expect(result.additionalProperties).toBeDefined();
      expect(result.additionalProperties).toHaveLength(1);
      expect(result.additionalProperties).toStrictEqual([
        {
          predicate: 'http://purl.org/dc/terms/description',
          value: { type: 'langString', value: 'A System is a unit of abstraction', language: 'en' },
        },
      ]);
    });

    it('should capture a URI/NamedNode value', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const uriTerm = {
        termType: 'NamedNode',
        value: 'https://w3id.org/nfdi4ing/profiles/some-profile',
      };

      builder.setAdditionalProperty('http://www.w3.org/2002/07/owl#imports', uriTerm as Term);
      const result = builder.build();

      expect(result.additionalProperties).toBeDefined();
      expect(result.additionalProperties).toHaveLength(1);
      expect(result.additionalProperties).toStrictEqual([
        {
          predicate: 'http://www.w3.org/2002/07/owl#imports',
          value: { type: 'uri', value: 'https://w3id.org/nfdi4ing/profiles/some-profile' },
        },
      ]);
    });

    it('should capture a blank node as URI', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const blankNodeTerm = {
        termType: 'BlankNode',
        value: 'n3-42',
      };

      builder.setAdditionalProperty('http://example.org/someProperty', blankNodeTerm as Term);
      const result = builder.build();

      expect(result.additionalProperties).toBeDefined();
      expect(result.additionalProperties).toHaveLength(1);
      expect(result.additionalProperties).toStrictEqual([
        {
          predicate: 'http://example.org/someProperty',
          value: { type: 'uri', value: 'n3-42' },
        },
      ]);
    });

    it('should capture multiple additional properties', () => {
      const builder = new ShapeDefinitionBuilder('test');

      const dateTerm = {
        termType: 'Literal',
        value: '2022-04-07',
        datatype: { value: 'http://www.w3.org/2001/XMLSchema#date' },
      };

      const titleEnTerm = {
        termType: 'Literal',
        value: 'System',
        language: 'en',
        datatype: { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
      };

      const titleDeTerm = {
        termType: 'Literal',
        value: 'System',
        language: 'de',
        datatype: { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
      };

      const licenseTerm = {
        termType: 'NamedNode',
        value: 'https://spdx.org/licenses/CC0-1.0.html',
      };

      builder
        .setAdditionalProperty('http://purl.org/dc/terms/created', dateTerm as Term)
        .setAdditionalProperty('http://purl.org/dc/terms/title', titleEnTerm as Term)
        .setAdditionalProperty('http://purl.org/dc/terms/title', titleDeTerm as Term)
        .setAdditionalProperty('http://purl.org/dc/terms/license', licenseTerm as Term);

      const result = builder.build();

      expect(result.additionalProperties).toBeDefined();
      expect(result.additionalProperties).toHaveLength(4);

      // Check created property
      const created = result.additionalProperties?.find(
        (p) => p.predicate === 'http://purl.org/dc/terms/created'
      );
      expect(created).toBeDefined();
      expect(created).toStrictEqual({
        predicate: 'http://purl.org/dc/terms/created',
        value: {
          type: 'literal',
          value: '2022-04-07',
          datatype: 'http://www.w3.org/2001/XMLSchema#date',
        },
      });

      // Check title properties (both languages)
      const titles = result.additionalProperties?.filter(
        (p) => p.predicate === 'http://purl.org/dc/terms/title'
      );
      expect(titles).toHaveLength(2);
      expect(titles?.[0].value.type).toBe('langString');
      expect(titles?.[1].value.type).toBe('langString');

      // Check license property
      const license = result.additionalProperties?.find(
        (p) => p.predicate === 'http://purl.org/dc/terms/license'
      );
      expect(license).toBeDefined();
      expect(license?.value.type).toBe('uri');
      expect(license?.value.value).toBe('https://spdx.org/licenses/CC0-1.0.html');
    });

    it('should not include additionalProperties field when no additional properties are set', () => {
      const builder = new ShapeDefinitionBuilder('test');
      builder.setType('http://www.w3.org/ns/shacl#NodeShape');
      const result = builder.build();
      expect(result.additionalProperties).toBeUndefined();
    });

    it('should support method chaining with additional properties', () => {
      const builder = new ShapeDefinitionBuilder('test');

      const dateTerm = {
        termType: 'Literal',
        value: '2022-04-07',
        datatype: { value: 'http://www.w3.org/2001/XMLSchema#date' },
      };

      const result = builder
        .setType('http://www.w3.org/ns/shacl#NodeShape')
        .setTargetClass('http://example.org/MyClass')
        .setAdditionalProperty('http://purl.org/dc/terms/created', dateTerm as Term)
        .setMinCount('1')
        .build();

      expect(result.shape?.type).toBe(SHAPE_TYPE.NODE_SHAPE);
      expect(result.shape?.targetClasses?.[0]).toBe('http://example.org/MyClass');
      expect(result.coreConstraints?.minCount).toBe(1);
      expect(result.additionalProperties).toBeDefined();
      expect(result.additionalProperties).toHaveLength(1);
    });

    it('should handle literal without explicit language (plain literal)', () => {
      const builder = new ShapeDefinitionBuilder('test');
      const plainLiteralTerm = {
        termType: 'Literal',
        value: 'Some plain text',
        datatype: { value: 'http://www.w3.org/2001/XMLSchema#string' },
      };

      builder.setAdditionalProperty('http://example.org/plainText', plainLiteralTerm as Term);
      const result = builder.build();
      expect(result.additionalProperties).toStrictEqual([
        {
          predicate: 'http://example.org/plainText',
          value: {
            type: 'literal',
            value: 'Some plain text',
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
          },
        },
      ]);
    });
  });
});
