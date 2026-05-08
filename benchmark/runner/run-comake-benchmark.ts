import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, relative, resolve } from 'path';
import { Parser as N3Parser, Writer as N3Writer } from 'n3';
import { nodeShapeToJSONSchema } from '@comake/shacl-to-json-schema';
import jsonld from 'jsonld';
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
const SHACL_NS = 'http://www.w3.org/ns/shacl#';

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

async function turtleToFramedJsonLd(turtleContent: string): Promise<unknown[]> {
  const parser = new N3Parser();
  const quads = parser.parse(turtleContent);

  const writer = new N3Writer({ format: 'application/n-quads' });
  for (const quad of quads) {
    writer.addQuad(quad);
  }
  const nquads: string = await new Promise((resolve, reject) => {
    writer.end((error: Error | null, result: string) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

  const doc = await jsonld.fromRDF(nquads);
  const framed = (await jsonld.frame(doc, {
    '@type': `${SHACL_NS}NodeShape`,
  })) as Record<string, unknown>;

  const graph = framed['@graph'];
  if (Array.isArray(graph)) return graph as unknown[];
  if (framed['@type']) return [framed];
  return [];
}

async function convertWithComake(
  ttlFile: string,
  outFile: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const turtle = readFileSync(ttlFile, 'utf8');
    const nodeShapes = await turtleToFramedJsonLd(turtle);

    if (nodeShapes.length === 0) return { ok: false, error: 'No NodeShapes found in JSON-LD' };

    if (nodeShapes.length === 1) {
      const schema = nodeShapeToJSONSchema(nodeShapes[0] as any);
      writeFileSync(outFile, JSON.stringify(schema, null, 2), 'utf8');
    } else {
      const defs: Record<string, unknown> = {};
      for (const shape of nodeShapes) {
        const record = shape as Record<string, unknown>;
        const id = (record['@id'] as string) ?? 'unknown';
        const name = id.includes('/')
          ? id.split('/').pop()!
          : id.includes('#')
            ? id.split('#').pop()!
            : id;
        const schema = nodeShapeToJSONSchema(shape as any);
        defs[name] = schema;
      }
      const first = Object.keys(defs)[0];
      const combined = { ...(defs[first] as object), $defs: defs };
      writeFileSync(outFile, JSON.stringify(combined, null, 2), 'utf8');
    }
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

async function main(): Promise<void> {
  if (!existsSync(SHACL_TO_JS_DIR)) {
    console.log('No shacl-to-json-schema benchmark directory found.');
    return;
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'comake-benchmark-'));
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

    for (const ttlFile of findFiles(SHACL_TO_JS_DIR, '.ttl')) {
      const dir = dirname(ttlFile);
      const base = basename(ttlFile, '.ttl');
      const jsonFile = join(dir, `${base}.json`);
      const relDir = relative(SHACL_TO_JS_DIR, dir) || '.';
      if (!matchesFileFilter(ttlFile, jsonFile)) continue;
      if (!existsSync(jsonFile)) {
        testNum++;
        console.log(
          `${pad(String(testNum), col.num)} ${pad('comake-shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad('N/A', col.f1)} ${pad('N/A', col.jaccard)} SKIPPED`
        );
        results.push({
          suite: 'comake-shacl-to-json-schema',
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
      const result = await convertWithComake(ttlFile, tempJson);
      const { f1, jaccard } = result.ok
        ? compareJson(jsonFile, tempJson)
        : { f1: 'ERROR', jaccard: 'ERROR' };
      const status = result.ok ? getStatus(f1, jaccard) : 'FAIL';
      if (!result.ok) {
        errors.push({ name: `${relDir}/${basename(ttlFile)}`, error: result.error });
      }

      console.log(
        `${pad(String(testNum), col.num)} ${pad('comake-shacl-to-json-schema', col.suite)} ${pad(relDir, col.loc)} ${pad(basename(ttlFile), col.file)} ${pad(f1, col.f1)} ${pad(jaccard, col.jaccard)} ${status}`
      );
      results.push({
        suite: 'comake-shacl-to-json-schema',
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

    const junitOut = resolveJunitPath(junitFile, 'comake-benchmark.xml');
    writeJunit(results, junitOut);
    console.log(`JUnit report written to: ${junitOut}`);

    const csvOut = resolveCsvPath(csvFile, 'comake-benchmark.csv');
    writeCsv(results, csvOut);
    console.log(`CSV report written to: ${csvOut}`);
  } finally {
    rmSync(tempDir, { recursive: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
