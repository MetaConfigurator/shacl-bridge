import { execSync } from 'child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, relative, resolve } from 'path';
import { compareJsonSchemas, JsonValue } from './compare-json-schemas';

const JS_TO_SHACL_DIR = join(__dirname, 'json-schema-to-shacl');
const SHACL_TO_JS_DIR = join(__dirname, 'shacl-to-json-schema');
const SHACL_BRIDGE = 'npx shacl-bridge';
const FAIL_THRESHOLD = 0.5;

type Status = 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';

interface TestResult {
  suite: string;
  name: string;
  f1: string;
  jaccard: string;
  status: Status;
  inputFile: string;
  expectedFile: string;
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.endsWith(ext) && entry !== 'manifest.json') {
      results.push(full);
    }
  }
  return results.sort();
}

function toShacl(jsonFile: string, outFile: string): boolean {
  try {
    execSync(`${SHACL_BRIDGE} to-shacl -i "${jsonFile}" -o "${outFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function toJsonSchema(ttlFile: string, outFile: string): boolean {
  const includeExtensions = basename(ttlFile, '.ttl').includes('ext');
  const flags = includeExtensions ? ' --include-shacl-extensions' : '';
  try {
    execSync(`${SHACL_BRIDGE} to-json-schema -i "${ttlFile}" -o "${outFile}"${flags}`, {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function compareShacl(expected: string, actual: string): { f1: string; jaccard: string } {
  try {
    const output = execSync(
      `${SHACL_BRIDGE} compare --expected "${expected}" --actual "${actual}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    const f1Match = /F1:\s+(\S+)/m.exec(output);
    const precisionMatch = /Precision:\s+(\S+)/m.exec(output);
    const recallMatch = /Recall:\s+(\S+)/m.exec(output);

    const f1 = f1Match ? f1Match[1] : 'N/A';

    if (precisionMatch && recallMatch) {
      const p = Number(precisionMatch[1]);
      const r = Number(recallMatch[1]);
      if (p === 0 || r === 0) return { f1, jaccard: '0.0000' };
      const jaccard = 1 / (1 / p + 1 / r - 1);
      return { f1, jaccard: jaccard.toFixed(4) };
    }
    return { f1, jaccard: 'N/A' };
  } catch {
    return { f1: 'N/A', jaccard: 'N/A' };
  }
}

function compareJson(expectedFile: string, actualFile: string): { f1: string; jaccard: string } {
  try {
    const expected = JSON.parse(readFileSync(expectedFile, 'utf8')) as JSON;
    const actual = JSON.parse(readFileSync(actualFile, 'utf8')) as JSON;
    const result = compareJsonSchemas(
      expected as unknown as JsonValue,
      actual as unknown as JsonValue
    );
    return { f1: result.f1.toFixed(4), jaccard: result.jaccard.toFixed(4) };
  } catch {
    return { f1: 'N/A', jaccard: 'N/A' };
  }
}

function getStatus(f1: string, jaccard: string): 'PASS' | 'WARN' | 'FAIL' {
  const f1n = Number(f1);
  const jn = Number(jaccard);
  if (isNaN(f1n) || isNaN(jn) || f1n < FAIL_THRESHOLD || jn < FAIL_THRESHOLD) return 'FAIL';
  if (f1n === 1 && jn === 1) return 'PASS';
  return 'WARN';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function writeJunit(results: TestResult[], outFile: string): void {
  const suites = new Map<string, TestResult[]>();
  for (const r of results) {
    if (!suites.has(r.suite)) suites.set(r.suite, []);
    suites.get(r.suite)?.push(r);
  }

  const totalFailures = results.filter((r) => r.status === 'FAIL').length;
  const totalSkipped = results.filter((r) => r.status === 'SKIPPED').length;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="shacl-bridge" tests="${String(results.length)}" failures="${String(totalFailures)}" skipped="${String(totalSkipped)}">\n`;

  for (const [suiteName, suiteResults] of suites) {
    const failures = suiteResults.filter((r) => r.status === 'FAIL').length;
    const skipped = suiteResults.filter((r) => r.status === 'SKIPPED').length;
    xml += `  <testsuite name="${escapeXml(suiteName)}" tests="${String(suiteResults.length)}" failures="${String(failures)}" skipped="${String(skipped)}">\n`;
    for (const r of suiteResults) {
      xml += `    <testcase name="${escapeXml(r.name)}" classname="${escapeXml(suiteName)}">\n`;
      if (r.status === 'SKIPPED') {
        xml += `      <skipped message="No expected file found: ${escapeXml(r.expectedFile)}" />\n`;
      } else if (r.status === 'FAIL') {
        xml += `      <failure message="${escapeXml(`F1: ${r.f1}, Jaccard: ${r.jaccard} — at least one score is below threshold ${String(FAIL_THRESHOLD)}`)}" />\n`;
      } else if (r.status === 'WARN') {
        xml += `      <system-out>WARNING: F1: ${escapeXml(r.f1)}, Jaccard: ${escapeXml(r.jaccard)} — at least one score is below 1.0</system-out>\n`;
      }
      xml += `      <properties>\n`;
      xml += `        <property name="f1" value="${escapeXml(r.f1)}" />\n`;
      xml += `        <property name="jaccard" value="${escapeXml(r.jaccard)}" />\n`;
      xml += `        <property name="status" value="${escapeXml(r.status)}" />\n`;
      xml += `        <property name="input" value="${escapeXml(r.inputFile)}" />\n`;
      xml += `        <property name="expected" value="${escapeXml(r.expectedFile)}" />\n`;
      xml += `      </properties>\n`;
      xml += `    </testcase>\n`;
    }
    xml += `  </testsuite>\n`;
  }

  xml += `</testsuites>\n`;
  writeFileSync(outFile, xml, 'utf8');
}

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

  if (junitFile) {
    writeJunit(results, junitFile);
    console.log(`JUnit report written to: ${junitFile}`);
  }
} finally {
  rmSync(tempDir, { recursive: true });
}
