// eslint-disable-next-line @typescript-eslint/no-require-imports
const { canonize } = require('rdf-canonize') as {
  canonize: (input: object[], options: { algorithm: string }) => Promise<string>;
};
import { Store } from 'n3';

export async function canonicalizeStore(store: Store): Promise<Set<string>> {
  const quads = store.getQuads(null, null, null, null);
  const canonical: string = await canonize(quads, { algorithm: 'URDNA2015' });
  return new Set(canonical.split('\n').filter((line) => line.trim().length > 0));
}
