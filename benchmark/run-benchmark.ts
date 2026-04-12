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
import { basename, dirname, join, relative } from 'path';

const JS_TO_SHACL_DIR = join(__dirname, 'json-schema-to-shacl');
const SHACL_TO_JS_DIR = join(__dirname, 'shacl-to-json-schema');
const SHACL_BRIDGE = 'npx shacl-bridge';
const FAIL_THRESHOLD = 0.5;
const WARN_THRESHOLD = 1.0;

interface TestResult {
  suite: string;
  name: string;
  score: string;
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.endsWith(ext)) {
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
  try {
    execSync(`${SHACL_BRIDGE} to-json-schema -i "${ttlFile}" -o "${outFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function compareShacl(file1: string, file2: string): string {
  try {
    const output = execSync(`${SHACL_BRIDGE} compare --file1 "${file1}" --file2 "${file2}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const match = /^Score:\s+(\S+)/m.exec(output);
    return match ? match[1] : 'N/A';
  } catch {
    return 'N/A';
  }
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortDeep(v)])
    );
  }
  return value;
}

function compareJson(expectedFile: string, actualFile: string): string {
  try {
    const expected = JSON.parse(readFileSync(expectedFile, 'utf8')) as JSON;
    const actual = JSON.parse(readFileSync(actualFile, 'utf8')) as JSON;
    return JSON.stringify(sortDeep(expected)) === JSON.stringify(sortDeep(actual)) ? '1.0' : '0.0';
  } catch {
    return 'N/A';
  }
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

  const isFail = (score: string) => {
    const n = Number(score);
    return isNaN(n) || n < FAIL_THRESHOLD;
  };
  const isWarn = (score: string) => {
    const n = Number(score);
    return !isNaN(n) && n >= FAIL_THRESHOLD && n < WARN_THRESHOLD;
  };

  const totalFailures = results.filter((r) => isFail(r.score)).length;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="shacl-bridge" tests="${String(results.length)}" failures="${String(totalFailures)}">\n`;

  for (const [suiteName, suiteResults] of suites) {
    const failures = suiteResults.filter((r) => isFail(r.score)).length;
    xml += `  <testsuite name="${escapeXml(suiteName)}" tests="${String(suiteResults.length)}" failures="${String(failures)}">\n`;
    for (const r of suiteResults) {
      xml += `    <testcase name="${escapeXml(r.name)}" classname="${escapeXml(suiteName)}">\n`;
      if (isFail(r.score)) {
        xml += `      <failure message="${escapeXml(`Score ${r.score} is below threshold ${String(FAIL_THRESHOLD)}`)}" />\n`;
      } else if (isWarn(r.score)) {
        xml += `      <failure type="warning" message="${escapeXml(`Score ${r.score} is below ${String(WARN_THRESHOLD)}`)}" />\n`;
      }
      xml += `    </testcase>\n`;
    }
    xml += `  </testsuite>\n`;
  }

  xml += `</testsuites>\n`;
  writeFileSync(outFile, xml, 'utf8');
}

const junitArgIndex = process.argv.indexOf('--junit');
const junitFile = junitArgIndex !== -1 ? process.argv[junitArgIndex + 1] : null;

const tempDir = mkdtempSync(join(tmpdir(), 'shacl-benchmark-'));
const results: TestResult[] = [];

try {
  const col = { num: 6, suite: 22, loc: 28, file: 35, score: 10 };
  const sep = '-'.repeat(col.num + col.suite + col.loc + col.file + col.score + 4);
  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

  console.log(
    `${pad('Test#', col.num)} ${pad('Suite', col.suite)} ${pad('Location', col.loc)} ${pad('File', col.file)} Score`
  );
  console.log(sep);

  let testNum = 0;

  // json-schema-to-shacl
  for (const jsonFile of findFiles(JS_TO_SHACL_DIR, '.json')) {
    const dir = dirname(jsonFile);
    const base = basename(jsonFile, '.json');
    const ttlFile = join(dir, `${base}.ttl`);
    if (!existsSync(ttlFile)) continue;

    testNum++;
    const tempTtl = join(tempDir, `${String(testNum)}_${base}.ttl`);
    const converted = toShacl(jsonFile, tempTtl);
    const score = converted ? compareShacl(ttlFile, tempTtl) : 'ERROR';
    const relDir = relative(JS_TO_SHACL_DIR, dir) || '.';

    console.log(
      `${pad(String(testNum), col.num)} ${pad('json-schema-to-shacl', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.file)} ${score}`
    );
    results.push({ suite: 'json-schema-to-shacl', name: `${relDir}/${base}`, score });
  }

  // shacl-to-json-schema
  if (existsSync(SHACL_TO_JS_DIR)) {
    for (const ttlFile of findFiles(SHACL_TO_JS_DIR, '.ttl')) {
      const dir = dirname(ttlFile);
      const base = basename(ttlFile, '.ttl');
      const jsonFile = join(dir, `${base}.json`);
      if (!existsSync(jsonFile)) continue;

      testNum++;
      const tempJson = join(tempDir, `${String(testNum)}_${base}.json`);
      const converted = toJsonSchema(ttlFile, tempJson);
      const score = converted ? compareJson(jsonFile, tempJson) : 'ERROR';
      const relDir = relative(SHACL_TO_JS_DIR, dir) || '.';

      console.log(
        `${pad(String(testNum), col.num)} ${pad('shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${score}`
      );
      results.push({ suite: 'shacl-to-json-schema', name: `${relDir}/${base}`, score });
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
