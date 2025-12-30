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
