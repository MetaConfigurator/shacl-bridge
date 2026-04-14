export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type FlatSchema = Record<string, JsonValue>;

export interface SchemaComparisonResult {
  precision: number;
  recall: number;
  f1: number;
  truePositives: Set<string>;
  falsePositives: Set<string>;
  falseNegatives: Set<string>;
  mismatches: Set<string>;
}

function resolveRefs(schema: JsonValue, root: JsonValue): JsonValue {
  if (Array.isArray(schema)) {
    return schema.map((item) => resolveRefs(item, root));
  }
  if (schema !== null && typeof schema === 'object') {
    const obj = schema as Record<string, JsonValue>;
    if ('$ref' in obj && typeof obj.$ref === 'string') {
      const ref = obj.$ref;
      if (ref.startsWith('#/')) {
        const parts = ref.slice(2).split('/');
        let resolved: JsonValue = root;
        for (const part of parts) {
          if (resolved !== null && typeof resolved === 'object' && !Array.isArray(resolved)) {
            resolved = (resolved as Record<string, JsonValue>)[part] ?? null;
          } else {
            return schema;
          }
        }
        return resolveRefs(resolved, root);
      }
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, resolveRefs(v, root)]));
  }
  return schema;
}

function normalizeValue(v: JsonValue): JsonValue {
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (v !== null && typeof v === 'object') {
    const obj = v as Record<string, JsonValue>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((k) => [k, normalizeValue(obj[k])])
    );
  }
  return v;
}

function equalValues(v1: JsonValue, v2: JsonValue): boolean {
  if (Array.isArray(v1) && Array.isArray(v2)) {
    const norm1 = v1
      .map(normalizeValue)
      .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
    const norm2 = v2
      .map(normalizeValue)
      .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
    return JSON.stringify(norm1) === JSON.stringify(norm2);
  }
  return JSON.stringify(normalizeValue(v1)) === JSON.stringify(normalizeValue(v2));
}

const METADATA_KEYS = new Set(['title', 'description', 'examples', '$id', '$schema']);

// Keys whose presence with their default value is semantically equivalent to absence.
const JSON_SCHEMA_DEFAULTS: Record<string, JsonValue> = {
  additionalProperties: true,
};

function flattenSchema(schema: JsonValue, ignoreMeta: boolean, path = ''): FlatSchema {
  const result: FlatSchema = {};
  if (schema !== null && typeof schema === 'object' && !Array.isArray(schema)) {
    const obj = schema as Record<string, JsonValue>;
    for (const [key, value] of Object.entries(obj)) {
      if (ignoreMeta && METADATA_KEYS.has(key)) continue;
      // By default, JSON Schema allows for additional properties, so skipping it
      if (
        key in JSON_SCHEMA_DEFAULTS &&
        JSON.stringify(value) === JSON.stringify(JSON_SCHEMA_DEFAULTS[key])
      )
        continue;
      const newPath = path ? `${path}.${key}` : key;
      Object.assign(result, flattenSchema(value, ignoreMeta, newPath));
    }
  } else if (Array.isArray(schema)) {
    const normalized = schema.map((item) =>
      typeof item === 'object' && item !== null ? flattenSchema(item, ignoreMeta) : item
    );
    normalized.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
    result[path] = normalized as JsonValue;
  } else {
    result[path] = schema;
  }
  return result;
}

export function compareJsonSchemas(
  reference: JsonValue,
  predicted: JsonValue,
  options: { ignoreMeta?: boolean; ignorePattern?: boolean } = {}
): SchemaComparisonResult {
  const { ignoreMeta = true, ignorePattern = true } = options;

  const refResolved = resolveRefs(reference, reference);
  const predResolved = resolveRefs(predicted, predicted);

  const flat1 = flattenSchema(refResolved, ignoreMeta);
  const flat2 = flattenSchema(predResolved, ignoreMeta);

  const refKeys = new Set(Object.keys(flat1));
  const predKeys = new Set(Object.keys(flat2));

  const truePositives = new Set<string>();
  const mismatches = new Set<string>();
  const falsePositives = new Set<string>([...predKeys].filter((k) => !refKeys.has(k)));
  const falseNegatives = new Set<string>([...refKeys].filter((k) => !predKeys.has(k)));

  for (const key of refKeys) {
    if (!predKeys.has(key)) continue;
    if (ignorePattern && key.endsWith('.pattern')) {
      truePositives.add(key);
      continue;
    }
    if (equalValues(flat1[key], flat2[key])) {
      truePositives.add(key);
    } else {
      mismatches.add(key);
    }
  }

  const tp = truePositives.size;
  const fp = falsePositives.size + mismatches.size;
  const fn = falseNegatives.size + mismatches.size;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1, truePositives, falsePositives, falseNegatives, mismatches };
}
