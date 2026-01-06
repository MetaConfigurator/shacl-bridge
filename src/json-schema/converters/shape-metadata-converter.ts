import { Shape } from '../../ir/meta-model/shape';
import { JsonSchemaObjectBuilder } from '../meta/json-schema-object-builder';
import { match } from 'ts-pattern';

const PREFIX = 'x-shacl';

export class ShapeMetadataConverter {
  private readonly shape: Shape | undefined;

  constructor(shape: Shape | undefined) {
    this.shape = shape;
  }

  applyToBuilder(builder: JsonSchemaObjectBuilder): void {
    if (!this.shape) return;

    Object.keys(this.shape).forEach((key) => {
      match(key)
        .with('message', () => {
          if (this.shape?.message == null) return;
          builder.customProperty(`${PREFIX}-message`, this.shape.message);
        })
        .with('severity', () => {
          if (this.shape?.severity == null) return;
          builder.customProperty(`${PREFIX}-severity`, this.shape.severity);
        })
        .with('deactivated', () => {
          if (this.shape?.deactivated == null || !this.shape.deactivated) return;
          builder.customProperty(`${PREFIX}-deactivated`, this.shape.deactivated);
        })
        .with('targetNodes', () => {
          if (this.shape?.targetNodes == null || this.shape.targetNodes.length === 0) return;
          builder.customProperty(`${PREFIX}-targetNodes`, this.shape.targetNodes);
        })
        .with('targetObjectsOf', () => {
          if (this.shape?.targetObjectsOf == null || this.shape.targetObjectsOf.length === 0)
            return;
          // If single value, output as string; if multiple, output as array
          if (this.shape.targetObjectsOf.length === 1) {
            builder.customProperty(`${PREFIX}-targetObjectsOf`, this.shape.targetObjectsOf[0]);
          } else {
            builder.customProperty(`${PREFIX}-targetObjectsOf`, this.shape.targetObjectsOf);
          }
        })
        .with('targetSubjectsOf', () => {
          if (this.shape?.targetSubjectsOf == null || this.shape.targetSubjectsOf.length === 0)
            return;
          // If single value, output as string; if multiple, output as array
          if (this.shape.targetSubjectsOf.length === 1) {
            builder.customProperty(`${PREFIX}-targetSubjectsOf`, this.shape.targetSubjectsOf[0]);
          } else {
            builder.customProperty(`${PREFIX}-targetSubjectsOf`, this.shape.targetSubjectsOf);
          }
        })
        .otherwise((key) => {
          // Skip type, path, targetClasses, etc. - these are structural, not metadata
          const value = this.shape?.[key as keyof Shape];
          if (value == null) return;

          // Only add non-structural shape properties as extensions
          if (
            ![
              'type',
              'path',
              'targetClasses',
              'targetNodes',
              'targetObjectsOf',
              'targetSubjectsOf',
              'rdfTypes',
            ].includes(key)
          ) {
            builder.customProperty(`${PREFIX}-${key}`, value);
          }
        });
    });
  }
}
