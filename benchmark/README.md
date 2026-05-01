# shacl-bridge Benchmark

Measures conversion quality for [shacl-bridge](https://github.com/MetaConfigurator/shacl-bridge) using F1 and Jaccard
similarity scores.

## Benchmarks

### `benchmark` — Direct conversion

Tests each conversion direction independently against known-good expected outputs.

| Suite                  | Input   | Expected output |
|------------------------|---------|-----------------|
| `json-schema-to-shacl` | `.json` | `.ttl`          |
| `shacl-to-json-schema` | `.ttl`  | `.json`         |

### `benchmark:roundtrip` — Round-trip conversion

Tests that a full round-trip produces output equivalent to the original input, with no expected output files needed.

| Suite                   | Pipeline                                             |
|-------------------------|------------------------------------------------------|
| `shacl-roundtrip`       | `.ttl` → JSON Schema → `.ttl` (compared to original) |
| `json-schema-roundtrip` | `.json` → SHACL → `.json` (compared to original)     |

## Running

### Mode 1 — Inside the project

Run from the project root. The benchmark will build and link the local source before running.

```bash
npm run benchmark
npm run benchmark:roundtrip
```

### Mode 2 — Standalone

Copy the `benchmark/` folder anywhere, then:

```bash
npm install          # installs shacl-bridge (latest) and jiti
npm run benchmark
npm run benchmark:roundtrip
```

## CLI flags

Both runners accept the same optional flags:

| Flag             | Description                                                           |
|------------------|-----------------------------------------------------------------------|
| `--junit <path>` | Write JUnit XML to a specific path (default: `results/benchmark.xml`) |
| `--csv <path>`   | Write CSV to a specific path (default: `results/benchmark.csv`)       |
| `--file <path>`  | Run only the test(s) at the given file or directory path              |

## Output

Results are always written to `results/` in the benchmark directory unless an explicit path is provided.

| File                              | Description                               |
|-----------------------------------|-------------------------------------------|
| `results/benchmark.xml`           | JUnit report for the direct benchmark     |
| `results/benchmark.csv`           | CSV report for the direct benchmark       |
| `results/roundtrip-benchmark.xml` | JUnit report for the round-trip benchmark |
| `results/roundtrip-benchmark.csv` | CSV report for the round-trip benchmark   |

### Status levels

| Status    | Meaning                                                |
|-----------|--------------------------------------------------------|
| `PASS`    | F1 = 1.0 and Jaccard = 1.0                             |
| `WARN`    | Both scores ≥ 0.5 but at least one is below 1.0        |
| `FAIL`    | At least one score is below 0.5, or conversion errored |
| `SKIPPED` | No expected output file found (direct benchmark only)  |

## Test data

```
benchmark/
├── json-schema-to-shacl/   # JSON Schema → SHACL test pairs
│   ├── additional-properties/
│   ├── array/
│   ├── const/
│   ├── def-ref/
│   ├── enum/
│   ├── logical/
│   ├── numeric/
│   ├── properties/
│   ├── required/
│   ├── string/
│   └── types/
└── shacl-to-json-schema/   # SHACL → JSON Schema test pairs
    ├── core/
    │   ├── cardiniality/
    │   ├── logical/
    │   ├── other/
    │   ├── property-pair/
    │   ├── shape-based/
    │   ├── string/
    │   ├── value-range/
    │   └── value-type/
    └── sparql/
```

Each test pair shares a base filename: `<name>.json` + `<name>.ttl`.