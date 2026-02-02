import { JsonSchemaObjectType } from '../../meta/json-schema-type';
import { match } from 'ts-pattern';
import {
  extractStrippedName,
  mapDataType,
  mapNodeKind,
  parseDefaultValue,
} from '../../../util/helpers';
import { JsonSchemaObjectBuilder } from '../../meta/json-schema-object-builder';
import { ShapeDefinition } from '../../../ir/meta-model/shape-definition';

import { StackElement } from '../../../stack/stack-element';
import { StackElementBuilder } from '../../../stack/stack-element-builder';
import { ConversionContext } from './conversion-context';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';
import {
  arraySetByContext,
  ConstraintCandidate,
  isNotNull,
  nonEmptyArray,
  numericDatatypeSpecified,
  setMaxItems,
  setMinItems,
  stringValue,
} from './constraint-conditions';
import { NodeKind } from '../../../ir/meta-model/node-kind';
import { Condition } from '../../../condition/condition';
import { ConversionOptions } from '../../conversion-options';

const PREFIX = 'x-shacl';

export class ConstraintConverter {
  private readonly context: ConversionContext;
  private readonly constraints: CoreConstraints;
  private readonly options: ConversionOptions;
  private readonly extensionsEnabled: () => boolean;

  constructor(
    private readonly sb: StackElementBuilder,
    private readonly processed: Map<ShapeDefinition, StackElement>,
    options: ConversionOptions = { excludeShaclExtensions: false }
  ) {
    this.context = sb.getContext();
    this.constraints = sb.getShape().coreConstraints ?? {};
    this.options = options;
    this.extensionsEnabled = () => !this.options.excludeShaclExtensions;
  }

  convert(): JsonSchemaObjectType {
    const builder = new JsonSchemaObjectBuilder();
    if (this.context.isInvalid) return builder.build();
    if (this.context.isArray) {
      builder.type('array');
    }
    Object.keys(this.constraints).forEach((key) => {
      match(key)
        .with('datatype', () => {
          new Condition()
            .on({
              key: 'datatype',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(arraySetByContext)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const itemBuilder = new JsonSchemaObjectBuilder();
              mapDataType(candidate.constraints.datatype, itemBuilder);
              builder.items(itemBuilder.build());
            })
            .otherwise((candidate: ConstraintCandidate) => {
              mapDataType(candidate.constraints.datatype, builder);
            })
            .execute();
        })
        .with('minLength', () => {
          new Condition()
            .on({
              key: 'minLength',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.minLength(candidate.constraints.minLength ?? 0);
              candidate.context.required = true;
            })
            .execute();
        })
        .with('maxLength', () => {
          new Condition()
            .on({
              key: 'maxLength',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.maxLength(candidate.constraints.maxLength ?? 0);
            })
            .execute();
        })
        // (min/max constraints only apply to numeric types in JSON Schema)
        .with('minInclusive', () => {
          new Condition()
            .on({
              key: 'minInclusive',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(numericDatatypeSpecified)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.minimum(candidate.constraints.minInclusive ?? 0);
            })
            .execute();
        })
        .with('maxInclusive', () => {
          new Condition()
            .on({
              key: 'maxInclusive',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(numericDatatypeSpecified)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.maximum(candidate.constraints.maxInclusive ?? 0);
            })
            .execute();
        })
        .with('minExclusive', () => {
          new Condition()
            .on({
              key: 'minExclusive',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(numericDatatypeSpecified)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.exclusiveMinimum(candidate.constraints.minExclusive ?? 0);
            })
            .execute();
        })
        .with('maxExclusive', () => {
          new Condition()
            .on({
              key: 'maxExclusive',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(numericDatatypeSpecified)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.exclusiveMaximum(candidate.constraints.maxExclusive ?? 0);
            })
            .execute();
        })
        .with('nodeKind', () => {
          new Condition()
            .on({
              key: 'nodeKind',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf((c) => !arraySetByContext(c))
            .ifSatisfied((candidate: ConstraintCandidate) => {
              mapNodeKind(candidate.constraints.nodeKind ?? NodeKind.IRI, builder);
            })
            .execute();
        })
        .with('in', () => {
          new Condition()
            .on({
              key: 'in',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.enum(candidate.constraints.in?.map(extractStrippedName) ?? []);
            })
            .execute();
        })
        .with('class', () => {
          new Condition()
            .on({
              key: 'class',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(arraySetByContext)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const existingItems = builder.getKey('items') as JsonSchemaObjectType;
              const ref = new JsonSchemaObjectBuilder()
                .$ref(`#/$defs/${extractStrippedName(candidate.constraints.class ?? '')}`)
                .build();
              builder.items({
                ...existingItems,
                ...ref,
              });
            })
            .otherwise((candidate: ConstraintCandidate) => {
              builder.$ref(`#/$defs/${extractStrippedName(candidate.constraints.class ?? '')}`);
            })
            .execute();
        })
        .with('node', () => {
          new Condition()
            .on({
              key: 'node',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(arraySetByContext)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const existingItems = builder.getKey('items') as JsonSchemaObjectType;
              const ref = new JsonSchemaObjectBuilder()
                .$ref(`#/$defs/${extractStrippedName(candidate.constraints.node ?? '')}`)
                .build();
              builder.items({
                ...existingItems,
                ...ref,
              });
            })
            .otherwise((candidate: ConstraintCandidate) => {
              builder.$ref(`#/$defs/${extractStrippedName(candidate.constraints.node ?? '')}`);
            })
            .execute();
        })
        .with('qualifiedValueShape', () => {
          new Condition()
            .on({
              key: 'qualifiedValueShape',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(arraySetByContext)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const existingItems = builder.getKey('items') as JsonSchemaObjectType;
              const ref = new JsonSchemaObjectBuilder()
                .$ref(
                  `#/$defs/${extractStrippedName(candidate.constraints.qualifiedValueShape ?? '')}`
                )
                .build();
              builder.items({
                ...existingItems,
                ...ref,
              });
            })
            .otherwise((candidate: ConstraintCandidate) => {
              builder.$ref(
                `#/$defs/${extractStrippedName(candidate.constraints.qualifiedValueShape ?? '')}`
              );
            })
            .execute();
        })
        .with('minCount', () => {
          new Condition()
            .on({
              key: 'minCount',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(setMinItems)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.minItems(candidate.constraints.minCount ?? 0)
            )
            .execute();
        })
        .with('maxCount', () => {
          new Condition()
            .on({
              key: 'maxCount',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(setMaxItems)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.maxItems(candidate.constraints.maxCount ?? 0)
            )
            .execute();
        })
        .with('qualifiedMinCount', () => {
          new Condition()
            .on({
              key: 'qualifiedMinCount',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(setMinItems)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.minItems(candidate.constraints.qualifiedMinCount ?? 0)
            )
            .execute();
        })
        .with('qualifiedMaxCount', () => {
          new Condition()
            .on({
              key: 'qualifiedMaxCount',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(setMaxItems)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.maxItems(candidate.constraints.qualifiedMaxCount ?? 0)
            )
            .execute();
        })
        .with('pattern', () => {
          new Condition()
            .on({
              key: 'pattern',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.pattern(candidate.constraints.pattern ?? '')
            )
            .execute();
        })
        .with('hasValue', () => {
          new Condition()
            .on({
              key: 'hasValue',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .allOf(stringValue)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              builder.const(extractStrippedName(candidate.constraints.hasValue as string));
            })
            .otherwise((candidate: ConstraintCandidate) => {
              if (candidate.constraints.hasValue == null) return;
              builder.const(candidate.constraints.hasValue);
            })
            .execute();
        })
        .with('or', () => {
          new Condition()
            .on({
              key: 'or',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const orSchemas =
                candidate.constraints.or
                  ?.map((node) =>
                    [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node))
                  )
                  .map((shape) => {
                    if (shape) return this.processed.get(shape);
                  })
                  .map((ele) => ele?.builder.build())
                  .filter((schema) => schema != null) ?? [];
              if (orSchemas.length > 0) builder.anyOf(orSchemas);
            })
            .execute();
        })
        .with('and', () => {
          new Condition()
            .on({
              key: 'and',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const andSchemas =
                candidate.constraints.and
                  ?.map((node) =>
                    [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node))
                  )
                  .map((shape) => {
                    if (shape) return this.processed.get(shape);
                  })
                  .map((ele) => ele?.builder.build())
                  .filter((schema) => schema != null) ?? [];
              if (andSchemas.length > 0) builder.allOf(andSchemas);
            })
            .execute();
        })
        .with('xone', () => {
          new Condition()
            .on({
              key: 'xone',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const xoneSchemas =
                candidate.constraints.xone
                  ?.map((node) =>
                    [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node))
                  )
                  .map((shape) => {
                    if (shape) return this.processed.get(shape);
                  })
                  .map((ele) => ele?.builder.build())
                  .filter((schema) => schema != null) ?? [];
              if (xoneSchemas.length > 0) builder.oneOf(xoneSchemas);
            })
            .execute();
        })
        .with('not', () => {
          new Condition()
            .on({
              key: 'not',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const notSchema = candidate.constraints.not
                ?.map((node) => [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node)))
                .map((shape) => {
                  if (shape) return this.processed.get(shape);
                })
                .map((ele) => ele?.builder.build())
                .filter((schema) => schema != null)
                .pop();
              if (notSchema == null) return;
              builder.not(notSchema);
            })
            .execute();
        })
        .with('lessThan', () => {
          new Condition()
            .on({
              key: 'lessThan',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.customProperty(
                `${PREFIX}-lessThan`,
                extractStrippedName(candidate.constraints.lessThan ?? '')
              )
            )
            .execute();
        })
        .with('equals', () => {
          new Condition()
            .on({
              key: 'equals',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.customProperty(
                `${PREFIX}-equals`,
                extractStrippedName(candidate.constraints.equals ?? '')
              )
            )
            .execute();
        })
        .with('defaultValue', () => {
          new Condition()
            .on({
              key: 'defaultValue',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              // Parse default value to appropriate JavaScript type based on datatype
              const parsedValue = parseDefaultValue(
                candidate.constraints.defaultValue ?? '',
                candidate.constraints.datatype
              );
              builder.default(parsedValue);
            })
            .execute();
        })
        .with('lessThanOrEquals', () => {
          new Condition()
            .on({
              key: 'lessThanOrEquals',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .ifSatisfied((candidate: ConstraintCandidate) =>
              builder.customProperty(
                `${PREFIX}-lessThanOrEquals`,
                extractStrippedName(candidate.constraints.lessThanOrEquals ?? '')
              )
            )
            .execute();
        })
        .with('disjoint', () => {
          new Condition()
            .on({
              key: 'disjoint',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .allOf(nonEmptyArray)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const disjointPaths =
                candidate.constraints.disjoint?.map((path) => extractStrippedName(path)) ?? [];
              if (disjointPaths.length === 1)
                builder.customProperty(`${PREFIX}-disjoint`, disjointPaths[0]);
              else builder.customProperty(`${PREFIX}-disjoint`, disjointPaths);
            })
            .execute();
        })
        .with('ignoredProperties', () => {
          new Condition()
            .on({
              key: 'ignoredProperties',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .allOf(nonEmptyArray)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const ignoredProperties = candidate.constraints.ignoredProperties ?? [];
              if (ignoredProperties.length === 0) return;
              builder.customProperty(`${PREFIX}-ignoredProperties`, ignoredProperties);
            })
            .execute();
        })
        .with('closed', () => {
          new Condition()
            .on({
              key: 'closed',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .ifSatisfied(() => builder.additionalProperties(false))
            .execute();
        })
        .with('sparqlConstraints', () => {
          new Condition()
            .on({
              key: 'sparqlConstraints',
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const sparqlConstraints = candidate.constraints.sparqlConstraints;
              if (sparqlConstraints && sparqlConstraints.length > 0) {
                builder.customProperty(`${PREFIX}-sparql`, sparqlConstraints);
              }
            })
            .execute();
        })
        .otherwise((key) => {
          if (key == 'property') return;
          new Condition()
            .on({
              key: key,
              context: this.context,
              constraints: this.constraints,
            } as ConstraintCandidate)
            .must(isNotNull)
            .must(this.extensionsEnabled)
            .ifSatisfied((candidate: ConstraintCandidate) => {
              const value = candidate.constraints[key as keyof CoreConstraints];
              if (value == null) return;
              builder.customProperty(`${PREFIX}-${key}`, value);
            })
            .execute();
        });
    });
    return builder.build();
  }
}
