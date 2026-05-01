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

function matchesFileFilter(inputFile: string): boolean {
  if (!fileArg) return true;
  if (fileArgIsDir) {
    return resolve(inputFile).startsWith(fileArg);
  }
  return fileArg === resolve(inputFile);
}

const tempDir = mkdtempSync(join(tmpdir(), 'shacl-roundtrip-'));
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

  // SHACL → JSON Schema → SHACL roundtrip
  if (existsSync(SHACL_TO_JS_DIR)) {
    for (const ttlFile of findFiles(SHACL_TO_JS_DIR, '.ttl')) {
      const dir = dirname(ttlFile);
      const base = basename(ttlFile, '.ttl');
      const relDir = relative(SHACL_TO_JS_DIR, dir) || '.';
      if (!matchesFileFilter(ttlFile)) continue;

      testNum++;
      const tempJson = join(tempDir, `${String(testNum)}_${base}.json`);
      const tempTtl = join(tempDir, `${String(testNum)}_${base}.ttl`);

      const step1 = toJsonSchema(ttlFile, tempJson);
      const step2 = step1 && toShacl(tempJson, tempTtl);
      const { f1, jaccard } =
        step1 && step2 ? compareShacl(ttlFile, tempTtl) : { f1: 'ERROR', jaccard: 'ERROR' };
      const status = step1 && step2 ? getStatus(f1, jaccard) : 'FAIL';

      console.log(
        `${pad(String(testNum), col.num)} ${pad('shacl-roundtrip', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
      );
      results.push({
        suite: 'shacl-roundtrip',
        name: `${relDir}/${base}`,
        f1,
        jaccard,
        status,
        inputFile: ttlFile,
        expectedFile: ttlFile,
      });
    }
  }

  // JSON Schema → SHACL → JSON Schema roundtrip
  for (const jsonFile of findFiles(JS_TO_SHACL_DIR, '.json')) {
    const dir = dirname(jsonFile);
    const base = basename(jsonFile, '.json');
    const relDir = relative(JS_TO_SHACL_DIR, dir) || '.';
    if (!matchesFileFilter(jsonFile)) continue;

    testNum++;
    const tempTtl = join(tempDir, `${String(testNum)}_${base}.ttl`);
    const tempJson = join(tempDir, `${String(testNum)}_${base}.json`);

    const step1 = toShacl(jsonFile, tempTtl);
    const step2 = step1 && toJsonSchema(tempTtl, tempJson);
    const { f1, jaccard } =
      step1 && step2 ? compareJson(jsonFile, tempJson) : { f1: 'ERROR', jaccard: 'ERROR' };
    const status = step1 && step2 ? getStatus(f1, jaccard) : 'FAIL';

    console.log(
      `${pad(String(testNum), col.num)} ${pad('json-schema-roundtrip', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
    );
    results.push({
      suite: 'json-schema-roundtrip',
      name: `${relDir}/${base}`,
      f1,
      jaccard,
      status,
      inputFile: jsonFile,
      expectedFile: jsonFile,
    });
  }

  console.log(sep);
  console.log(`Total: ${String(testNum)} test(s)`);

  const junitOut = resolveJunitPath(junitFile, 'roundtrip-benchmark.xml');
  writeJunit(results, junitOut);
  console.log(`JUnit report written to: ${junitOut}`);
} finally {
  rmSync(tempDir, { recursive: true });
}
