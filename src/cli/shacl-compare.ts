import fs from 'fs';
import { ShaclParser } from '../shacl/parser/shacl-parser';
import { ShaclComparator } from '../compare/shacl-comparator';
import { CompareOptions } from './cli-constants';
import { TripleDiff } from '../compare/types';
import { Prefixes } from 'n3';

export class ShaclCompare {
  constructor(private readonly options: CompareOptions) {}

  async compare(): Promise<void> {
    const { expected, actual, shorten } = this.options;

    if (!fs.existsSync(expected)) throw new Error(`File not found: ${expected}`);
    if (!fs.existsSync(actual)) throw new Error(`File not found: ${actual}`);

    const result = await new ShaclComparator(expected, actual).compare();

    const prefixes = shorten ? await this.collectPrefixes(expected, actual) : {};
    const format = (triple: string) => (shorten ? applyPrefixes(triple, prefixes) : triple);

    console.log(
      `Precision: ${result.precision.toFixed(4)}  Recall: ${result.recall.toFixed(4)}  F1: ${result.f1.toFixed(4)}\n`
    );

    if (result.onlyInExpected.length === 0 && result.onlyInActual.length === 0) {
      console.log('Files are identical.');
      return;
    }

    if (result.onlyInExpected.length > 0) {
      console.log(`Only in expected (${expected}):`);
      printGroups(result.onlyInExpected, format);
    }

    if (result.onlyInActual.length > 0) {
      console.log(`Only in actual (${actual}):`);
      printGroups(result.onlyInActual, format);
    }
  }

  private async collectPrefixes(expected: string, actual: string): Promise<Prefixes> {
    const [docExpected, docActual] = await Promise.all([
      new ShaclParser().withPath(expected).parse(),
      new ShaclParser().withPath(actual).parse(),
    ]);
    return { ...docExpected.prefix, ...docActual.prefix };
  }
}

function printGroups(groups: TripleDiff[], format: (t: string) => string): void {
  for (const group of groups) {
    console.log(`  [${group.subject}]`);
    for (const triple of group.triples) {
      console.log(`    ${format(triple)}`);
    }
  }
  console.log('');
}

function applyPrefixes(triple: string, prefixes: Prefixes): string {
  let result = triple;
  for (const [prefix, uri] of Object.entries(prefixes)) {
    const uriStr = uri.value;
    result = result.split(`<${uriStr}`).join(`${prefix}:`).split(uriStr).join(`${prefix}:`);
  }
  // clean up any lingering > after prefix replacement
  result = result.replace(/([a-zA-Z_][\w.-]*:[^\s>]+)>/g, '$1');
  return result;
}
