import { execSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, relative, resolve } from 'path';
import {
  compareShacl,
  findFiles,
  getStatus,
  printSummary,
  resolveCsvPath,
  resolveJunitPath,
  TestResult,
  writeCsv,
  writeJunit,
} from './common';

const JS_TO_SHACL_DIR = join(__dirname, '..', 'json-schema-to-shacl');
const PYTHON_SCRIPT = join(__dirname, 'jsonschema2shacl_convert.py');

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

function convertWithJsonSchema2Shacl(
  jsonFile: string,
  outFile: string
): { ok: true } | { ok: false; error: string } {
  try {
    execSync(`python3 "${PYTHON_SCRIPT}" "${jsonFile}" "${outFile}"`, { stdio: 'pipe' });
    return { ok: true };
  } catch (err: unknown) {
    const raw =
      err instanceof Error
        ? ((err as Error & { stderr?: Buffer }).stderr?.toString().trim() ?? err.message)
        : String(err);
    // Extract just the last line of a Python traceback for concise output
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const msg = lines[lines.length - 1] || raw;
    return { ok: false, error: msg };
  }
}

if (!existsSync(JS_TO_SHACL_DIR)) {
  console.log('No json-schema-to-shacl benchmark directory found.');
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), 'jsonschema2shacl-benchmark-'));
const results: TestResult[] = [];
const errors: { name: string; error: string }[] = [];

try {
  const col = { num: 6, suite: 28, loc: 28, file: 32, f1: 8, jaccard: 10, status: 7 };
  const sep = '-'.repeat(
    col.num + col.suite + col.loc + col.file + col.f1 + col.jaccard + col.status + 6
  );
  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

  console.log(
    `${pad('Test#', col.num)} ${pad('Suite', col.suite)} ${pad('Location', col.loc)} ${pad('File', col.file)} ${pad('F1', col.f1)} ${pad('Jaccard', col.jaccard)} Status`
  );
  console.log(sep);

  let testNum = 0;

  for (const jsonFile of findFiles(JS_TO_SHACL_DIR, '.json')) {
    const dir = dirname(jsonFile);
    const base = basename(jsonFile, '.json');
    const ttlFile = join(dir, `${base}.ttl`);
    const relDir = relative(JS_TO_SHACL_DIR, dir) || '.';
    if (!matchesFileFilter(jsonFile, ttlFile)) continue;
    if (!existsSync(ttlFile)) {
      testNum++;
      console.log(
        `${pad(String(testNum), col.num)} ${pad('jsonschema2shacl', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.file)} ${pad('N/A', col.f1)} ${pad('N/A', col.jaccard)} SKIPPED`
      );
      results.push({
        suite: 'jsonschema2shacl',
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
    const result = convertWithJsonSchema2Shacl(jsonFile, tempTtl);
    const { f1, jaccard } = result.ok
      ? compareShacl(ttlFile, tempTtl)
      : { f1: 'ERROR', jaccard: 'ERROR' };
    const status = result.ok ? getStatus(f1, jaccard) : 'FAIL';
    if (!result.ok) {
      errors.push({ name: `${relDir}/${basename(jsonFile)}`, error: result.error });
    }

    console.log(
      `${pad(String(testNum), col.num)} ${pad('jsonschema2shacl', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
    );
    results.push({
      suite: 'jsonschema2shacl',
      name: `${relDir}/${base}`,
      f1,
      jaccard,
      status,
      inputFile: jsonFile,
      expectedFile: ttlFile,
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

  const junitOut = resolveJunitPath(junitFile, 'jsonschema2shacl-benchmark.xml');
  writeJunit(results, junitOut);
  console.log(`JUnit report written to: ${junitOut}`);

  const csvOut = resolveCsvPath(csvFile, 'jsonschema2shacl-benchmark.csv');
  writeCsv(results, csvOut);
  console.log(`CSV report written to: ${csvOut}`);
} finally {
  rmSync(tempDir, { recursive: true });
}
