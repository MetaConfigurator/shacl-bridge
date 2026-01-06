import { JsonSchemaObjectType } from '../../meta/json-schema-type';
import { match } from 'ts-pattern';
import {
  extractStrippedName,
  isNumericDatatype,
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
    if (this.context.isArray) {
      builder.type('array');
    }
    Object.keys(this.constraints).forEach((key) => {
      match(key)
        .with('datatype', () => {
          if (this.constraints.datatype == null) return;
          if (this.context.isArray) {
            const itemBuilder = new JsonSchemaObjectBuilder();
            mapDataType(this.constraints.datatype, itemBuilder);
            builder.items(itemBuilder.build());
          } else mapDataType(this.constraints.datatype, builder);
        })
        .with('minLength', () => {
          if (this.constraints.minLength == null) return;
          builder.minLength(this.constraints.minLength);
          this.context.required = true;
        })
        .with('maxLength', () => {
          if (this.constraints.maxLength == null) return;
          builder.maxLength(this.constraints.maxLength);
        })
        .with('minInclusive', () => {
          // Skip if value is null, or if datatype exists but is not numeric
          // (min/max constraints only apply to numeric types in JSON Schema)
          if (
            this.constraints.minInclusive == null ||
            (this.constraints.datatype && !isNumericDatatype(this.constraints.datatype))
          )
            return;
          builder.minimum(this.constraints.minInclusive);
        })
        .with('maxInclusive', () => {
          // Skip if value is null, or if datatype exists but is not numeric
          if (
            this.constraints.maxInclusive == null ||
            (this.constraints.datatype && !isNumericDatatype(this.constraints.datatype))
          )
            return;
          builder.maximum(this.constraints.maxInclusive);
        })
        .with('minExclusive', () => {
          // Skip if value is null, or if datatype exists but is not numeric
          if (
            this.constraints.minExclusive == null ||
            (this.constraints.datatype && !isNumericDatatype(this.constraints.datatype))
          )
            return;
          builder.exclusiveMinimum(this.constraints.minExclusive);
        })
        .with('maxExclusive', () => {
          // Skip if value is null, or if datatype exists but is not numeric
          if (
            this.constraints.maxExclusive == null ||
            (this.constraints.datatype && !isNumericDatatype(this.constraints.datatype))
          )
            return;
          builder.exclusiveMaximum(this.constraints.maxExclusive);
        })
        .with('nodeKind', () => {
          if (this.constraints.nodeKind == null) return;
          if (!this.context.isArray) {
            mapNodeKind(this.constraints.nodeKind, builder);
          }
        })
        .with('in', () => {
          if (
            this.constraints.in == null ||
            !Array.isArray(this.constraints.in) ||
            this.constraints.in.length == 0
          )
            return;
          builder.enum(this.constraints.in);
        })
        .with('class', () => {
          if (this.constraints.class == null) return;
          if (this.context.isArray) {
            const existingItems = builder.getKey('items') as JsonSchemaObjectType;
            const ref = new JsonSchemaObjectBuilder()
              .$ref(`#/$defs/${extractStrippedName(this.constraints.class)}`)
              .build();
            builder.items({
              ...existingItems,
              ...ref,
            });
          } else {
            builder.$ref(`#/$defs/${extractStrippedName(this.constraints.class)}`);
          }
        })
        .with('node', () => {
          if (this.constraints.node == null) return;
          if (this.context.isArray) {
            const existingItems = builder.getKey('items') as JsonSchemaObjectType;
            const ref = new JsonSchemaObjectBuilder()
              .$ref(`#/$defs/${extractStrippedName(this.constraints.node)}`)
              .build();
            builder.items({
              ...existingItems,
              ...ref,
            });
          } else {
            builder.$ref(`#/$defs/${extractStrippedName(this.constraints.node)}`);
          }
        })
        .with('qualifiedValueShape', () => {
          if (this.constraints.qualifiedValueShape == null) return;
          if (this.context.isArray) {
            const existingItems = builder.getKey('items') as JsonSchemaObjectType;
            const ref = new JsonSchemaObjectBuilder()
              .$ref(`#/$defs/${extractStrippedName(this.constraints.qualifiedValueShape)}`)
              .build();
            builder.items({
              ...existingItems,
              ...ref,
            });
          } else {
            builder.$ref(`#/$defs/${extractStrippedName(this.constraints.qualifiedValueShape)}`);
          }
        })
        .with('minCount', () => {
          if (this.constraints.minCount == null || !this.context.setMinItems) return;
          builder.minItems(this.constraints.minCount);
        })
        .with('maxCount', () => {
          if (this.constraints.maxCount == null || !this.context.setMaxItems) return;
          builder.maxItems(this.constraints.maxCount);
        })
        .with('qualifiedMinCount', () => {
          if (this.constraints.qualifiedMinCount == null || !this.context.setMinItems) return;
          builder.minItems(this.constraints.qualifiedMinCount);
        })
        .with('qualifiedMaxCount', () => {
          if (this.constraints.qualifiedMaxCount == null || !this.context.setMaxItems) return;
          builder.maxItems(this.constraints.qualifiedMaxCount);
        })
        .with('pattern', () => {
          if (this.constraints.pattern == null) return;
          builder.pattern(this.constraints.pattern);
        })
        .with('hasValue', () => {
          if (this.constraints.hasValue == null) return;
          builder.const(this.constraints.hasValue);
        })
        .with('or', () => {
          if (this.constraints.or == null) return;
          const orSchemas = this.constraints.or
            .map((node) => [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node)))
            .map((shape) => {
              if (shape) return this.processed.get(shape);
            })
            .map((ele) => ele?.builder.build())
            .filter((schema) => schema != null);
          builder.anyOf(orSchemas);
        })
        .with('and', () => {
          if (this.constraints.and == null) return;
          const andSchemas = this.constraints.and
            .map((node) => [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node)))
            .map((shape) => {
              if (shape) return this.processed.get(shape);
            })
            .map((ele) => ele?.builder.build())
            .filter((schema) => schema != null);
          builder.allOf(andSchemas);
        })
        .with('xone', () => {
          if (this.constraints.xone == null) return;
          const xoneSchemas = this.constraints.xone
            .map((node) => [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node)))
            .map((shape) => {
              if (shape) return this.processed.get(shape);
            })
            .map((ele) => ele?.builder.build())
            .filter((schema) => schema != null);
          builder.oneOf(xoneSchemas);
        })
        .with('not', () => {
          if (this.constraints.not == null) return;
          const notSchema = this.constraints.not
            .map((node) => [...this.processed.keys()].find((sh) => sh.nodeKey.endsWith(node)))
            .map((shape) => {
              if (shape) return this.processed.get(shape);
            })
            .map((ele) => ele?.builder.build())
            .filter((schema) => schema != null)
            .pop();
          if (notSchema == null) return;
          builder.not(notSchema);
        })
        .with('lessThan', () => {
          if (this.constraints.lessThan == null) return;
          builder.customProperty(
            `${PREFIX}-lessThan`,
            extractStrippedName(this.constraints.lessThan)
          );
        })
        .with('equals', () => {
          if (this.constraints.equals == null) return;
          builder.customProperty(`${PREFIX}-equals`, extractStrippedName(this.constraints.equals));
        })
        .with('defaultValue', () => {
          if (this.constraints.defaultValue == null) return;
          // Parse default value to appropriate JavaScript type based on datatype
          const parsedValue = parseDefaultValue(
            this.constraints.defaultValue,
            this.constraints.datatype
          );
          builder.default(parsedValue);
        })
        .with('lessThanOrEquals', () => {
          if (this.constraints.lessThanOrEquals == null) return;
          builder.customProperty(
            `${PREFIX}-lessThanOrEquals`,
            extractStrippedName(this.constraints.lessThanOrEquals)
          );
        })
        .otherwise((key) => {
          const value = this.constraints[key as keyof CoreConstraints];
          if (value == null) return;
          builder.customProperty(`${PREFIX}-${key}`, value);
        });
    });
    return builder.build();
  }
}
