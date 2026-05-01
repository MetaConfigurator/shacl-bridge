import { execSync } from 'child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { compareJsonSchemas, JsonValue } from '../compare-json-schemas';

export const SHACL_BRIDGE = 'npx shacl-bridge';
export const FAIL_THRESHOLD = 0.5;

export type Status = 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';

export interface TestResult {
  suite: string;
  name: string;
  f1: string;
  jaccard: string;
  status: Status;
  inputFile: string;
  expectedFile: string;
}

export function findFiles(dir: string, ext: string): string[] {
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

export function toShacl(jsonFile: string, outFile: string): boolean {
  try {
    execSync(`${SHACL_BRIDGE} to-shacl -i "${jsonFile}" -o "${outFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function toJsonSchema(ttlFile: string, outFile: string): boolean {
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

export function compareShacl(expected: string, actual: string): { f1: string; jaccard: string } {
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

export function compareJson(
  expectedFile: string,
  actualFile: string
): { f1: string; jaccard: string } {
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

export function getStatus(f1: string, jaccard: string): 'PASS' | 'WARN' | 'FAIL' {
  const f1n = Number(f1);
  const jn = Number(jaccard);
  if (isNaN(f1n) || isNaN(jn) || f1n < FAIL_THRESHOLD || jn < FAIL_THRESHOLD) return 'FAIL';
  if (f1n === 1 && jn === 1) return 'PASS';
  return 'WARN';
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveJunitPath(explicitPath: string | null, defaultFilename: string): string {
  if (explicitPath) return explicitPath;
  const resultsDir = join(process.cwd(), 'results');
  mkdirSync(resultsDir, { recursive: true });
  return join(resultsDir, defaultFilename);
}

export function writeJunit(results: TestResult[], outFile: string): void {
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
