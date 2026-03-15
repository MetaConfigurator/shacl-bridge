import fs from 'fs';
import { ShaclParser } from '../shacl/parser/shacl-parser';
import { ShaclComparator } from '../compare/shacl-comparator';
import { CompareOptions } from './cli-constants';
import { TripleDiff } from '../compare/types';
import { Prefixes } from 'n3';

export class ShaclCompare {
  constructor(private readonly options: CompareOptions) {}

  async compare(): Promise<void> {
    const { file1, file2, shorten } = this.options;

    if (!fs.existsSync(file1)) throw new Error(`File not found: ${file1}`);
    if (!fs.existsSync(file2)) throw new Error(`File not found: ${file2}`);

    const result = await new ShaclComparator(file1, file2).compare();

    const prefixes = shorten ? await this.collectPrefixes(file1, file2) : {};
    const format = (triple: string) => (shorten ? applyPrefixes(triple, prefixes) : triple);

    const scorePercent = (result.score * 100).toFixed(1);
    console.log(`Score: ${result.score.toFixed(4)} (${scorePercent}% similar)\n`);

    if (result.onlyInFile1.length === 0 && result.onlyInFile2.length === 0) {
      console.log('Files are identical.');
      return;
    }

    if (result.onlyInFile1.length > 0) {
      console.log(`Only in ${file1}:`);
      printGroups(result.onlyInFile1, format);
    }

    if (result.onlyInFile2.length > 0) {
      console.log(`Only in ${file2}:`);
      printGroups(result.onlyInFile2, format);
    }
  }

  private async collectPrefixes(file1: string, file2: string): Promise<Prefixes> {
    const [doc1, doc2] = await Promise.all([
      new ShaclParser().withPath(file1).parse(),
      new ShaclParser().withPath(file2).parse(),
    ]);
    return { ...doc1.prefix, ...doc2.prefix };
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
