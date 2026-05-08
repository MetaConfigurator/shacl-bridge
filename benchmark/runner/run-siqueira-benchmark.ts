import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, relative, resolve } from 'path';
import { getUniqueSchemaFromTtl } from 'shacl-jsonschema-converter';
import {
  compareJson,
  findFiles,
  getStatus,
  printSummary,
  resolveCsvPath,
  resolveJunitPath,
  TestResult,
  writeCsv,
  writeJunit,
} from './common';

const SHACL_TO_JS_DIR = join(__dirname, '..', 'shacl-to-json-schema');

const junitArgIndex = process.argv.indexOf('--junit');
const junitFile = junitArgIndex !== -1 ? process.argv[junitArgIndex + 1] : null;

const csvArgIndex = process.argv.indexOf('--csv');
const csvFile = csvArgIndex !== -1 ? process.argv[csvArgIndex + 1] : null;

const fileArgIndex = process.argv.indexOf('--file');
const fileArg = fileArgIndex !== -1 ? resolve(process.argv[fileArgIndex + 1]) : null;

const fileArgIsDir = fileArg !== null && existsSync(fileArg) && statSync(fileArg).isDirectory();

function matchesFileFilter(inputFile: string, expectedFile: string): boolean {
  if (!fileArg) return true;
  if (fileArgIsDir) {
    return resolve(inputFile).startsWith(fileArg) || resolve(expectedFile).startsWith(fileArg);
  }
  return fileArg === resolve(inputFile) || fileArg === resolve(expectedFile);
}

/**
 * Injects sh:ignoredProperties ( rdf:type ) and sh:closed true into every
 * NodeShape that lacks them, so the siqueira converter can process the file.
 */
function preprocessTurtle(turtle: string): string {
  let result = turtle;
  if (!/^@prefix\s+rdf:\s/m.test(result)) {
    result = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n${result}`;
  }
  if (!/^@prefix\s+ex:\s/m.test(result)) {
    result = `@prefix ex: <http://example.org/> .\n${result}`;
  }

  // Match each NodeShape block: find "a sh:NodeShape ;" and inject missing properties
  // before the next sh: keyword
  result = result.replace(
    /(a\s+sh:NodeShape\s*;)([\s\S]*?)(\s*sh:\w+\s)/g,
    (_match, head: string, middle: string, nextKeyword: string) => {
      let injected = '';
      if (!middle.includes('sh:targetClass')) {
        injected += '\n    sh:targetClass ex:DummyClass ;';
      }
      if (!middle.includes('sh:closed')) {
        injected += '\n    sh:closed true ;';
      }
      if (!middle.includes('sh:ignoredProperties')) {
        injected += '\n    sh:ignoredProperties ( rdf:type ) ;';
      }
      return `${head}${middle}${injected}${nextKeyword}`;
    }
  );

  return result;
}

function convertWithSiqueira(
  ttlFile: string,
  outFile: string
): { ok: true } | { ok: false; error: string } {
  try {
    const turtle = readFileSync(ttlFile, 'utf8');
    const processed = preprocessTurtle(turtle);
    const schema = getUniqueSchemaFromTtl(processed);
    writeFileSync(outFile, JSON.stringify(schema, null, 2), 'utf8');
    return { ok: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as Record<string, unknown>).message)
          : String(err);
    return { ok: false, error: msg };
  }
}

if (!existsSync(SHACL_TO_JS_DIR)) {
  console.log('No shacl-to-json-schema benchmark directory found.');
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), 'siqueira-benchmark-'));
const results: TestResult[] = [];
const errors: { name: string; error: string }[] = [];

try {
  const col = { num: 6, suite: 30, loc: 28, file: 32, f1: 8, jaccard: 10, status: 7 };
  const sep = '-'.repeat(
    col.num + col.suite + col.loc + col.file + col.f1 + col.jaccard + col.status + 6
  );
  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

  console.log(
    `${pad('Test#', col.num)} ${pad('Suite', col.suite)} ${pad('Location', col.loc)} ${pad('File', col.file)} ${pad('F1', col.f1)} ${pad('Jaccard', col.jaccard)} Status`
  );
  console.log(sep);

  let testNum = 0;

  for (const ttlFile of findFiles(SHACL_TO_JS_DIR, '.ttl')) {
    const dir = dirname(ttlFile);
    const base = basename(ttlFile, '.ttl');
    const jsonFile = join(dir, `${base}.json`);
    const relDir = relative(SHACL_TO_JS_DIR, dir) || '.';
    if (!matchesFileFilter(ttlFile, jsonFile)) continue;
    if (!existsSync(jsonFile)) {
      testNum++;
      console.log(
        `${pad(String(testNum), col.num)} ${pad('siqueira-shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad('N/A', col.f1)} ${pad('N/A', col.jaccard)} SKIPPED`
      );
      results.push({
        suite: 'siqueira-shacl-to-json-schema',
        name: `${relDir}/${base}`,
        f1: 'N/A',
        jaccard: 'N/A',
        status: 'SKIPPED',
        inputFile: ttlFile,
        expectedFile: jsonFile,
      });
      continue;
    }

    testNum++;
    const tempJson = join(tempDir, `${String(testNum)}_${base}.json`);
    const result = convertWithSiqueira(ttlFile, tempJson);
    const { f1, jaccard } = result.ok
      ? compareJson(jsonFile, tempJson)
      : { f1: 'ERROR', jaccard: 'ERROR' };
    const status = result.ok ? getStatus(f1, jaccard) : 'FAIL';
    if (!result.ok) {
      errors.push({ name: `${relDir}/${basename(ttlFile)}`, error: result.error });
    }

    console.log(
      `${pad(String(testNum), col.num)} ${pad('siqueira-shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
    );
    results.push({
      suite: 'siqueira-shacl-to-json-schema',
      name: `${relDir}/${base}`,
      f1,
      jaccard,
      status,
      inputFile: ttlFile,
      expectedFile: jsonFile,
    });
  }

  console.log(sep);
  printSummary(results);

  if (errors.length > 0) {
    console.log();
    console.log('Errors');
    console.log('-'.repeat(80));
    for (const { name, error } of errors) {
      console.log(`  ${name}: ${error}`);
    }
  }

  const junitOut = resolveJunitPath(junitFile, 'siqueira-benchmark.xml');
  writeJunit(results, junitOut);
  console.log(`JUnit report written to: ${junitOut}`);

  const csvOut = resolveCsvPath(csvFile, 'siqueira-benchmark.csv');
  writeCsv(results, csvOut);
  console.log(`CSV report written to: ${csvOut}`);
} finally {
  rmSync(tempDir, { recursive: true });
}
