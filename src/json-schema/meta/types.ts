export type UnmappableConstraintStrategy = 'extension' | 'warn' | 'error';

export interface GeneratorConfig {
  includeMetadata?: boolean;
  preserveRdfMetadata?: boolean;
  unmappableConstraints?: UnmappableConstraintStrategy;
}
