import { execSync } from 'child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, relative } from 'path';

const BENCHMARK_DIR = __dirname;
const SHACL_BRIDGE = 'npx shacl-bridge';

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findJsonFiles(full));
    } else if (entry.endsWith('.json')) {
      results.push(full);
    }
  }
  return results.sort();
}

function toShacl(jsonFile: string, outFile: string): boolean {
  try {
    execSync(`${SHACL_BRIDGE} to-shacl -i "${jsonFile}" -o "${outFile}"`, {
      stdio: 'pipe',
    });
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

const tempDir = mkdtempSync(join(tmpdir(), 'shacl-benchmark-'));

try {
  const jsonFiles = findJsonFiles(BENCHMARK_DIR);

  const col = { num: 6, loc: 30, json: 30, ttl: 30, score: 10 };
  const sep = '-'.repeat(col.num + col.loc + col.json + col.ttl + col.score + 4);

  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

  console.log(
    `${pad('Test#', col.num)} ${pad('Location', col.loc)} ${pad('JSON File', col.json)} ${pad('TTL File', col.ttl)} Score`
  );
  console.log(sep);

  let testNum = 0;

  for (const jsonFile of jsonFiles) {
    const dir = dirname(jsonFile);
    const base = basename(jsonFile, '.json');
    const ttlFile = join(dir, `${base}.ttl`);

    if (!existsSync(ttlFile)) continue;

    testNum++;
    const tempTtl = join(tempDir, `${String(testNum)}_${base}.ttl`);
    const converted = toShacl(jsonFile, tempTtl);
    const score = converted ? compareShacl(ttlFile, tempTtl) : 'ERROR';
    const relDir = relative(BENCHMARK_DIR, dir) || '.';

    console.log(
      `${pad(String(testNum), col.num)} ${pad(relDir, col.loc)} ${pad(basename(jsonFile), col.json)} ${pad(basename(ttlFile), col.ttl)} ${score}`
    );
  }

  console.log(sep);
  console.log(`Total: ${String(testNum)} test(s)`);
} finally {
  rmSync(tempDir, { recursive: true });
}
