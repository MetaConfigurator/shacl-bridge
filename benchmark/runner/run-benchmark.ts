import { existsSync, mkdtempSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, relative, resolve } from 'path';
import {
  compareJson,
  compareShacl,
  findFiles,
  getStatus,
  resolveJunitPath,
  TestResult,
  toJsonSchema,
  toShacl,
  writeJunit,
} from './common';

const JS_TO_SHACL_DIR = join(__dirname, '..', 'json-schema-to-shacl');
const SHACL_TO_JS_DIR = join(__dirname, '..', 'shacl-to-json-schema');

const junitArgIndex = process.argv.indexOf('--junit');
const junitFile = junitArgIndex !== -1 ? process.argv[junitArgIndex + 1] : null;

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

const tempDir = mkdtempSync(join(tmpdir(), 'shacl-benchmark-'));
const results: TestResult[] = [];

try {
  const col = { num: 6, suite: 22, loc: 28, file: 32, f1: 8, jaccard: 10, status: 7 };
  const sep = '-'.repeat(
    col.num + col.suite + col.loc + col.file + col.f1 + col.jaccard + col.status + 6
  );
  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

  console.log(
    `${pad('Test#', col.num)} ${pad('Suite', col.suite)} ${pad('Location', col.loc)} ${pad('File', col.file)} ${pad('F1', col.f1)} ${pad('Jaccard', col.jaccard)} Status`
  );
  console.log(sep);

  let testNum = 0;

  // json-schema-to-shacl
  for (const jsonFile of findFiles(JS_TO_SHACL_DIR, '.json')) {
    const dir = dirname(jsonFile);
    const base = basename(jsonFile, '.json');
    const ttlFile = join(dir, `${base}.ttl`);
    const relDir = relative(JS_TO_SHACL_DIR, dir) || '.';
    if (!matchesFileFilter(jsonFile, ttlFile)) continue;
    if (!existsSync(ttlFile)) {
      testNum++;
      console.log(
        `${pad(String(testNum), col.num)} ${pad('json-schema-to-shacl', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.file)} ${pad('N/A', col.f1)} ${pad('N/A', col.jaccard)} SKIPPED`
      );
      results.push({
        suite: 'json-schema-to-shacl',
        name: `${relDir}/${base}`,
        f1: 'N/A',
        jaccard: 'N/A',
        status: 'SKIPPED',
        inputFile: jsonFile,
        expectedFile: ttlFile,
      });
      continue;
    }

    testNum++;
    const tempTtl = join(tempDir, `${String(testNum)}_${base}.ttl`);
    const converted = toShacl(jsonFile, tempTtl);
    const { f1, jaccard } = converted
      ? compareShacl(ttlFile, tempTtl)
      : { f1: 'ERROR', jaccard: 'ERROR' };
    const status = converted ? getStatus(f1, jaccard) : 'FAIL';

    console.log(
      `${pad(String(testNum), col.num)} ${pad('json-schema-to-shacl', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
    );
    results.push({
      suite: 'json-schema-to-shacl',
      name: `${relDir}/${base}`,
      f1,
      jaccard,
      status,
      inputFile: jsonFile,
      expectedFile: ttlFile,
    });
  }

  // shacl-to-json-schema
  if (existsSync(SHACL_TO_JS_DIR)) {
    for (const ttlFile of findFiles(SHACL_TO_JS_DIR, '.ttl')) {
      const dir = dirname(ttlFile);
      const base = basename(ttlFile, '.ttl');
      const jsonFile = join(dir, `${base}.json`);
      const relDir = relative(SHACL_TO_JS_DIR, dir) || '.';
      if (!matchesFileFilter(ttlFile, jsonFile)) continue;
      if (!existsSync(jsonFile)) {
        testNum++;
        console.log(
          `${pad(String(testNum), col.num)} ${pad('shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad('N/A', col.f1)} ${pad('N/A', col.jaccard)} SKIPPED`
        );
        results.push({
          suite: 'shacl-to-json-schema',
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
      const converted = toJsonSchema(ttlFile, tempJson);
      const { f1, jaccard } = converted
        ? compareJson(jsonFile, tempJson)
        : { f1: 'ERROR', jaccard: 'ERROR' };
      const status = converted ? getStatus(f1, jaccard) : 'FAIL';

      console.log(
        `${pad(String(testNum), col.num)} ${pad('shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
      );
      results.push({
        suite: 'shacl-to-json-schema',
        name: `${relDir}/${base}`,
        f1,
        jaccard,
        status,
        inputFile: ttlFile,
        expectedFile: jsonFile,
      });
    }
  }

  console.log(sep);
  console.log(`Total: ${String(testNum)} test(s)`);

  const junitOut = resolveJunitPath(junitFile, 'benchmark.xml');
  writeJunit(results, junitOut);
  console.log(`JUnit report written to: ${junitOut}`);
} finally {
  rmSync(tempDir, { recursive: true });
}
