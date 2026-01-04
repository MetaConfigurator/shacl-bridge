export function extractName(uri: string): string {
  if (!uri) {
    return '';
  }

  const hashIndex = uri.lastIndexOf('#');
  if (hashIndex !== -1 && hashIndex < uri.length - 1) {
    return uri.substring(hashIndex + 1);
  }

  const slashIndex = uri.lastIndexOf('/');
  if (slashIndex !== -1 && slashIndex < uri.length - 1) {
    return uri.substring(slashIndex + 1);
  }

  return uri;
}

export function stripShape(name: string) {
  if (name.endsWith('Shape') || name.endsWith('shape')) {
    const withOutShape = name.replace(/Shape|shape$/g, '');
    if (withOutShape !== '') return withOutShape;
  }
  return name;
}

export function extractStrippedName(uri: string): string {
  return stripShape(extractName(uri));
}

export function hasKeyAtAnyLevel(obj: unknown, targetKey: string): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (targetKey in obj) {
    return true;
  }

  return Object.values(obj).some((value) => hasKeyAtAnyLevel(value, targetKey));
}
