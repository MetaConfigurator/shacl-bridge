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
  ArraySetByContext,
  IsNonEmptyArray,
  IsNotNull,
  IsNumericDatatypeIfSpecified,
  IsStringValue,
  SetMaxItems,
  SetMinItems,
} from './constraint-conditions';
import { Check } from '../../../condition/condition';
import { NodeKind } from '../../../ir/meta-model/node-kind';

const PREFIX = 'x-shacl';

export class ConstraintConverter {
  private readonly context: ConversionContext;
  private readonly constraints: CoreConstraints;

  constructor(
    private readonly sb: StackElementBuilder,
    private readonly processed: Map<ShapeDefinition, StackElement>
  ) {
    this.context = sb.getContext();
    this.constraints = sb.getShape().coreConstraints ?? {};
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
          new Check()
            .on({ key: 'datatype', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new ArraySetByContext())
            .ifSatisfied(() => {
              const itemBuilder = new JsonSchemaObjectBuilder();
              mapDataType(this.constraints.datatype, itemBuilder);
              builder.items(itemBuilder.build());
            })
            .otherwise(() => {
              mapDataType(this.constraints.datatype, builder);
            })
            .execute();
        })
        .with('minLength', () => {
          new Check()
            .on({ key: 'minLength', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              builder.minLength(this.constraints.minLength ?? 0);
              this.context.required = true;
            })
            .execute();
        })
        .with('maxLength', () => {
          new Check()
            .on({ key: 'maxLength', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              builder.maxLength(this.constraints.maxLength ?? 0);
            })
            .execute();
        })
        // (min/max constraints only apply to numeric types in JSON Schema)
        .with('minInclusive', () => {
          new Check()
            .on({ key: 'minInclusive', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new IsNumericDatatypeIfSpecified())
            .ifSatisfied(() => {
              builder.minimum(this.constraints.minInclusive ?? 0);
            })
            .execute();
        })
        .with('maxInclusive', () => {
          new Check()
            .on({ key: 'maxInclusive', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new IsNumericDatatypeIfSpecified())
            .ifSatisfied(() => {
              builder.maximum(this.constraints.maxInclusive ?? 0);
            })
            .execute();
        })
        .with('minExclusive', () => {
          new Check()
            .on({
              key: 'minExclusive',
              context: this.context,
              constraints: this.constraints,
            })
            .with(new IsNumericDatatypeIfSpecified())
            .ifSatisfied(() => {
              builder.exclusiveMinimum(this.constraints.minExclusive ?? 0);
            })
            .execute();
        })
        .with('maxExclusive', () => {
          new Check()
            .on({
              key: 'maxExclusive',
              context: this.context,
              constraints: this.constraints,
            })
            .with(new IsNumericDatatypeIfSpecified())
            .ifSatisfied(() => {
              builder.exclusiveMaximum(this.constraints.maxExclusive ?? 0);
            })
            .execute();
        })
        .with('nodeKind', () => {
          new Check()
            .on({ key: 'nodeKind', context: this.context, constraints: this.constraints })
            .with(new ArraySetByContext())
            .not()
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              mapNodeKind(this.constraints.nodeKind ?? NodeKind.IRI, builder);
            })
            .execute();
        })
        .with('in', () => {
          new Check()
            .on({ key: 'in', context: this.context, constraints: this.constraints })
            .with(new IsNonEmptyArray())
            .ifSatisfied(() => {
              builder.enum(this.constraints.in?.map(extractStrippedName) ?? []);
            })
            .execute();
        })
        .with('class', () => {
          new Check()
            .on({ key: 'class', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new ArraySetByContext())
            .ifSatisfied(() => {
              const existingItems = builder.getKey('items') as JsonSchemaObjectType;
              const ref = new JsonSchemaObjectBuilder()
                .$ref(`#/$defs/${extractStrippedName(this.constraints.class ?? '')}`)
                .build();
              builder.items({
                ...existingItems,
                ...ref,
              });
            })
            .otherwise(() =>
              builder.$ref(`#/$defs/${extractStrippedName(this.constraints.class ?? '')}`)
            )
            .execute();
        })
        .with('node', () => {
          new Check()
            .on({ key: 'node', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new ArraySetByContext())
            .ifSatisfied(() => {
              const existingItems = builder.getKey('items') as JsonSchemaObjectType;
              const ref = new JsonSchemaObjectBuilder()
                .$ref(`#/$defs/${extractStrippedName(this.constraints.node ?? '')}`)
                .build();
              builder.items({
                ...existingItems,
                ...ref,
              });
            })
            .otherwise(() =>
              builder.$ref(`#/$defs/${extractStrippedName(this.constraints.node ?? '')}`)
            )
            .execute();
        })
        .with('qualifiedValueShape', () => {
          new Check()
            .on({
              key: 'qualifiedValueShape',
              context: this.context,
              constraints: this.constraints,
            })
            .gate(new IsNotNull())
            .with(new ArraySetByContext())
            .ifSatisfied(() => {
              const existingItems = builder.getKey('items') as JsonSchemaObjectType;
              const ref = new JsonSchemaObjectBuilder()
                .$ref(`#/$defs/${extractStrippedName(this.constraints.qualifiedValueShape ?? '')}`)
                .build();
              builder.items({
                ...existingItems,
                ...ref,
              });
            })
            .otherwise(() =>
              builder.$ref(
                `#/$defs/${extractStrippedName(this.constraints.qualifiedValueShape ?? '')}`
              )
            )
            .execute();
        })
        .with('minCount', () => {
          new Check()
            .on({ key: 'minCount', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new SetMinItems())
            .ifSatisfied(() => builder.minItems(this.constraints.minCount ?? 0))
            .execute();
        })
        .with('maxCount', () => {
          new Check()
            .on({ key: 'maxCount', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new SetMaxItems())
            .ifSatisfied(() => builder.maxItems(this.constraints.maxCount ?? 0))
            .execute();
        })
        .with('qualifiedMinCount', () => {
          new Check()
            .on({ key: 'qualifiedMinCount', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new SetMinItems())
            .ifSatisfied(() => builder.minItems(this.constraints.qualifiedMinCount ?? 0))
            .execute();
        })
        .with('qualifiedMaxCount', () => {
          new Check()
            .on({ key: 'qualifiedMaxCount', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new SetMaxItems())
            .ifSatisfied(() => builder.maxItems(this.constraints.qualifiedMaxCount ?? 0))
            .execute();
        })
        .with('pattern', () => {
          new Check()
            .on({ key: 'pattern', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => builder.pattern(this.constraints.pattern ?? ''))
            .execute();
        })
        .with('hasValue', () => {
          new Check()
            .on({ key: 'hasValue', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new IsStringValue())
            .ifSatisfied(() =>
              builder.const(extractStrippedName(this.constraints.hasValue as string))
            )
            .otherwise(() => {
              // TS Shenanigans
              if (this.constraints.hasValue == null) return;
              builder.const(this.constraints.hasValue);
            })
            .execute();
        })
        .with('or', () => {
          new Check()
            .on({ key: 'or', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              const orSchemas =
                this.constraints.or
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
          new Check()
            .on({ key: 'and', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              const andSchemas =
                this.constraints.and
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
          new Check()
            .on({ key: 'xone', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              const xoneSchemas =
                this.constraints.xone
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
          new Check()
            .on({ key: 'not', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              const notSchema = this.constraints.not
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
          new Check()
            .on({ key: 'lessThan', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() =>
              builder.customProperty(
                `${PREFIX}-lessThan`,
                extractStrippedName(this.constraints.lessThan ?? '')
              )
            )
            .execute();
        })
        .with('equals', () => {
          new Check()
            .on({ key: 'equals', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() =>
              builder.customProperty(
                `${PREFIX}-equals`,
                extractStrippedName(this.constraints.equals ?? '')
              )
            )
            .execute();
        })
        .with('defaultValue', () => {
          new Check()
            .on({ key: 'defaultValue', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              // Parse default value to appropriate JavaScript type based on datatype
              const parsedValue = parseDefaultValue(
                this.constraints.defaultValue ?? '',
                this.constraints.datatype
              );
              builder.default(parsedValue);
            })
            .execute();
        })
        .with('lessThanOrEquals', () => {
          new Check()
            .on({
              key: 'lessThanOrEquals',
              context: this.context,
              constraints: this.constraints,
            })
            .gate(new IsNotNull())
            .ifSatisfied(() =>
              builder.customProperty(
                `${PREFIX}-lessThanOrEquals`,
                extractStrippedName(this.constraints.lessThanOrEquals ?? '')
              )
            )
            .execute();
        })
        .with('disjoint', () => {
          new Check()
            .on({ key: 'disjoint', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .with(new IsNonEmptyArray())
            .ifSatisfied(() => {
              const disjointPaths =
                this.constraints.disjoint?.map((path) => extractStrippedName(path)) ?? [];
              if (disjointPaths.length === 1)
                builder.customProperty(`${PREFIX}-disjoint`, disjointPaths[0]);
              else builder.customProperty(`${PREFIX}-disjoint`, disjointPaths);
            })
            .execute();
        })
        .with('ignoredProperties', () => {
          new Check()
            .on({
              key: 'ignoredProperties',
              context: this.context,
              constraints: this.constraints,
            })
            .gate(new IsNotNull())
            .with(new IsNonEmptyArray())
            .ifSatisfied(() => {
              const ignoredProperties = this.constraints.ignoredProperties ?? [];
              if (ignoredProperties.length === 0) return;
              builder.customProperty(`${PREFIX}-ignoredProperties`, ignoredProperties);
            })
            .execute();
        })
        .with('closed', () => {
          new Check()
            .on({ key: 'closed', context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => builder.additionalProperties(false))
            .execute();
        })
        .otherwise((key) => {
          if (key == 'property') return;
          new Check()
            .on({ key: key, context: this.context, constraints: this.constraints })
            .gate(new IsNotNull())
            .ifSatisfied(() => {
              const value = this.constraints[key as keyof CoreConstraints];
              if (value == null) return;
              builder.customProperty(`${PREFIX}-${key}`, value);
            })
            .execute();
        });
    });
    return builder.build();
  }
}
