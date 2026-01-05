import { JsonSchema } from '../../meta/types';
import { JsonSchemaObjectType } from '../../meta/json-schema-type';
import { match } from 'ts-pattern';
import { extractStrippedName, mapDataType, mapNodeKind } from '../../../util/helpers';
import { JsonSchemaObjectBuilder } from '../../meta/json-schema-object-builder';
import { ShapeDefinition } from '../../../ir/meta-model/shape-definition';

import { StackElement } from '../../../stack/stack-element';
import { StackElementBuilder } from '../../../stack/stack-element-builder';
import { ConversionContext } from './conversion-context';
import { CoreConstraints } from '../../../ir/meta-model/core-constraints';

export type ConstraintResult = Pick<
  JsonSchema,
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'type'
  | 'format'
  | 'enum'
  | 'x-shacl-nodeKind'
  | '$ref'
  | 'minItems'
  | 'maxItems'
>;

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
          if (this.constraints.minInclusive == null) return;
          builder.minimum(this.constraints.minInclusive);
        })
        .with('maxInclusive', () => {
          if (this.constraints.maxInclusive == null) return;
          builder.maximum(this.constraints.maxInclusive);
        })
        .with('minExclusive', () => {
          if (this.constraints.minExclusive == null) return;
          builder.exclusiveMinimum(this.constraints.minExclusive);
        })
        .with('maxExclusive', () => {
          if (this.constraints.maxExclusive == null) return;
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
        .with('minCount', () => {
          if (this.constraints.minCount == null || !this.context.setMinItems) return;
          builder.minItems(this.constraints.minCount);
        })
        .with('maxCount', () => {
          if (this.constraints.maxCount == null || !this.context.setMaxItems) return;
          builder.maxItems(this.constraints.maxCount);
        })
        .with('pattern', () => {
          if (this.constraints.pattern == null) return;
          builder.pattern(this.constraints.pattern);
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
        });
    });
    return builder.build();
  }
}
