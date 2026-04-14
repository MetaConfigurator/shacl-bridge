#!/bin/bash

# End-to-end CLI integration test
# This script installs the CLI and tests it like a real user would

set -e

echo "Integration Tests"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
  echo ""
  echo "${YELLOW}Cleaning up...${NC}"
  if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
  npm unlink -g shacl-bridge 2>/dev/null || true
  cd "$ORIGINAL_DIR"
}

trap cleanup EXIT

ORIGINAL_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)

echo "Running tsc"
npm run build

echo ""
echo "Running npm link"
npm link

echo ""
echo "Checking if shacl-bridge is linked"
if ! command -v shacl-bridge &> /dev/null; then
    echo -e "${RED}shacl-bridge command not found after npm link${NC}"
    exit 1
fi
echo -e "${GREEN}shacl-bridge command is available${NC}"

echo ""
echo "Test 1: --version flag"
VERSION_OUTPUT=$(shacl-bridge --version)
echo "Output: $VERSION_OUTPUT"
if [[ $VERSION_OUTPUT =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${GREEN}Version output is valid${NC}"
else
    echo -e "${RED}Invalid version format${NC}"
    exit 1
fi

echo ""
echo "Test 2: --help flag"
HELP_OUTPUT=$(shacl-bridge --help)
if [[ $HELP_OUTPUT == *"Usage:"* ]] && [[ $HELP_OUTPUT == *"shacl-bridge"* ]]; then
    echo -e "${GREEN}Help output is valid${NC}"
else
    echo -e "${RED}Help output is invalid${NC}"
    exit 1
fi

echo ""
echo "Test 3: to-json-schema --help flag"
TO_JSON_SCHEMA_HELP=$(shacl-bridge to-json-schema --help)
if [[ $TO_JSON_SCHEMA_HELP == *"to-json-schema"* ]] && [[ $TO_JSON_SCHEMA_HELP == *"--input"* ]]; then
    echo -e "${GREEN}to-json-schema help output is valid${NC}"
else
    echo -e "${RED}to-json-schema help output is invalid${NC}"
    exit 1
fi

echo ""
echo "Test 4: to-shacl --help flag"
TO_SHACL_HELP=$(shacl-bridge to-shacl --help)
if [[ $TO_SHACL_HELP == *"to-shacl"* ]] && [[ $TO_SHACL_HELP == *"--input"* ]]; then
    echo -e "${GREEN}to-shacl help output is valid${NC}"
else
    echo -e "${RED}to-shacl help output is invalid${NC}"
    exit 1
fi

echo ""
echo "=== SHACL to JSON Schema Tests ==="

echo ""
echo "Test 5: Convert cardinality-constraints.ttl with -i and -o flags"
OUTPUT_FILE="$TEMP_DIR/test-output.json"
shacl-bridge to-json-schema -i samples/shacl/cardinality-constraints.ttl -o "$OUTPUT_FILE"

if [ ! -f "$OUTPUT_FILE" ]; then
    echo -e "${RED}Output file was not created${NC}"
    exit 1
fi

# Validate JSON structure
if ! jq empty "$OUTPUT_FILE" 2>/dev/null; then
    echo -e "${RED}Output is not valid JSON${NC}"
    exit 1
fi

SCHEMA_VERSION=$(jq -r '."$schema"' "$OUTPUT_FILE")
if [ "$SCHEMA_VERSION" != "https://json-schema.org/draft/2020-12/schema" ]; then
    echo -e "${RED}Invalid schema version${NC}"
    exit 1
fi

DEFS_COUNT=$(jq '."$defs" | length' "$OUTPUT_FILE")
if [ "$DEFS_COUNT" -lt 1 ]; then
    echo -e "${RED}No definitions found in output${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully converted SHACL to JSON Schema${NC}"
echo "  Output file size: $(wc -c < "$OUTPUT_FILE") bytes"
echo "  Number of definitions: $DEFS_COUNT"

echo ""
echo "Test 6: Convert to stdout (no -o flag)"
STDOUT_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl)
if ! echo "$STDOUT_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}Stdout output is not valid JSON${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully output JSON to stdout${NC}"

echo ""
echo "Test 7: Error handling - nonexistent file"
if shacl-bridge to-json-schema -i nonexistent-file.ttl 2>/dev/null; then
    echo -e "${RED}Should have failed with nonexistent file${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly handles nonexistent files${NC}"

echo ""
echo "Test 8: Convert JSON-LD file with --json-ld flag"
JSONLD_OUTPUT_FILE="$TEMP_DIR/test-jsonld-output.json"
shacl-bridge to-json-schema -i samples/shacl/simple-shacl.jsonld --json-ld -o "$JSONLD_OUTPUT_FILE"

if [ ! -f "$JSONLD_OUTPUT_FILE" ]; then
    echo -e "${RED}JSON-LD output file was not created${NC}"
    exit 1
fi

# Validate JSON structure
if ! jq empty "$JSONLD_OUTPUT_FILE" 2>/dev/null; then
    echo -e "${RED}JSON-LD output is not valid JSON${NC}"
    exit 1
fi

JSONLD_SCHEMA_VERSION=$(jq -r '."$schema"' "$JSONLD_OUTPUT_FILE")
if [ "$JSONLD_SCHEMA_VERSION" != "https://json-schema.org/draft/2020-12/schema" ]; then
    echo -e "${RED}Invalid schema version in JSON-LD output${NC}"
    exit 1
fi

JSONLD_DEFS_COUNT=$(jq '."$defs" | length' "$JSONLD_OUTPUT_FILE")
if [ "$JSONLD_DEFS_COUNT" -lt 1 ]; then
    echo -e "${RED}No definitions found in JSON-LD output${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully converted JSON-LD to JSON Schema${NC}"
echo "  Output file size: $(wc -c < "$JSONLD_OUTPUT_FILE") bytes"
echo "  Number of definitions: $JSONLD_DEFS_COUNT"

echo ""
echo "Test 9: Convert JSON-LD to stdout with --json-ld flag"
JSONLD_STDOUT_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.jsonld --json-ld)
if ! echo "$JSONLD_STDOUT_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}JSON-LD stdout output is not valid JSON${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully output JSON-LD conversion to stdout${NC}"

echo ""
echo "Test 10: --mode single (explicit)"
SINGLE_MODE_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode single)
if ! echo "$SINGLE_MODE_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}Single mode output is not valid JSON${NC}"
    exit 1
fi
if ! echo "$SINGLE_MODE_OUTPUT" | jq -e '."$defs"' > /dev/null 2>&1; then
    echo -e "${RED}Single mode output missing \$defs${NC}"
    exit 1
fi
echo -e "${GREEN}Single mode works correctly${NC}"

echo ""
echo "Test 11: --mode multi creates individual files"
MULTI_OUTPUT_DIR="$TEMP_DIR/multi-output"
mkdir -p "$MULTI_OUTPUT_DIR"
shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode multi -o "$MULTI_OUTPUT_DIR"

FILE_COUNT=$(ls -1 "$MULTI_OUTPUT_DIR"/*.json 2>/dev/null | wc -l)
if [ "$FILE_COUNT" -lt 1 ]; then
    echo -e "${RED}No JSON files created in multi mode${NC}"
    exit 1
fi

# Check that Person.json exists and is valid
PERSON_FILE="$MULTI_OUTPUT_DIR/Person.json"
if [ ! -f "$PERSON_FILE" ]; then
    echo -e "${RED}Person.json not created in multi mode${NC}"
    exit 1
fi

if ! jq empty "$PERSON_FILE" 2>/dev/null; then
    echo -e "${RED}Person.json is not valid JSON${NC}"
    exit 1
fi

PERSON_SCHEMA_VERSION=$(jq -r '."$schema"' "$PERSON_FILE")
if [ "$PERSON_SCHEMA_VERSION" != "https://json-schema.org/draft/2020-12/schema" ]; then
    echo -e "${RED}Invalid schema version in Person.json${NC}"
    exit 1
fi

echo -e "${GREEN}Multi mode creates individual files correctly${NC}"
echo "  Files created: $FILE_COUNT"

echo ""
echo "Test 12: --mode multi converts \$ref to external file references"
MULTI_REF_DIR="$TEMP_DIR/multi-ref-output"
mkdir -p "$MULTI_REF_DIR"
shacl-bridge to-json-schema -i samples/shacl/complex-shacl.ttl --mode multi -o "$MULTI_REF_DIR"

# Check that no file contains internal $defs references
for file in "$MULTI_REF_DIR"/*.json; do
    if grep -q '#/\$defs/' "$file" 2>/dev/null; then
        echo -e "${RED}File $file still contains internal \$defs reference${NC}"
        exit 1
    fi
done
echo -e "${GREEN}Multi mode correctly converts \$ref to external file references${NC}"

echo ""
echo "Test 13: --mode multi without -o should fail"
if shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode multi 2>/dev/null; then
    echo -e "${RED}Should have failed when using multi mode without -o${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly requires -o flag for multi mode${NC}"

echo ""
echo "Test 14: --mode with invalid value should fail"
if shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode invalid 2>/dev/null; then
    echo -e "${RED}Should have failed with invalid mode value${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly rejects invalid mode values${NC}"

echo ""
echo "Test 15: --exclude-shacl-extensions excludes x-shacl-prefixes"
EXCLUDE_EXT_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --exclude-shacl-extensions)
if echo "$EXCLUDE_EXT_OUTPUT" | jq -e '."x-shacl-prefixes"' > /dev/null 2>&1; then
    echo -e "${RED}x-shacl-prefixes should not be present with --exclude-shacl-extensions${NC}"
    exit 1
fi
if ! echo "$EXCLUDE_EXT_OUTPUT" | jq -e '."$schema"' > /dev/null 2>&1; then
    echo -e "${RED}Output should still have \$schema${NC}"
    exit 1
fi
echo -e "${GREEN}--exclude-shacl-extensions correctly excludes x-shacl-prefixes${NC}"

echo ""
echo "Test 16: Without --exclude-shacl-extensions, x-shacl-prefixes is present"
DEFAULT_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl)
if ! echo "$DEFAULT_OUTPUT" | jq -e '."x-shacl-prefixes"' > /dev/null 2>&1; then
    echo -e "${RED}x-shacl-prefixes should be present by default${NC}"
    exit 1
fi
echo -e "${GREEN}x-shacl-prefixes is present by default${NC}"

echo ""
echo "Test 17: --exclude-shacl-extensions works with --mode multi"
MULTI_EXCLUDE_DIR="$TEMP_DIR/multi-exclude-output"
mkdir -p "$MULTI_EXCLUDE_DIR"
shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode multi -o "$MULTI_EXCLUDE_DIR" --exclude-shacl-extensions

PERSON_EXCLUDE_FILE="$MULTI_EXCLUDE_DIR/Person.json"
if [ ! -f "$PERSON_EXCLUDE_FILE" ]; then
    echo -e "${RED}Person.json not created in multi mode with --exclude-shacl-extensions${NC}"
    exit 1
fi

if jq -e '."x-shacl-prefixes"' "$PERSON_EXCLUDE_FILE" > /dev/null 2>&1; then
    echo -e "${RED}x-shacl-prefixes should not be present in multi mode with --exclude-shacl-extensions${NC}"
    exit 1
fi
echo -e "${GREEN}--exclude-shacl-extensions works correctly with --mode multi${NC}"

echo ""
echo "=== JSON Schema to SHACL Tests ==="

echo ""
echo "Test 18: Convert JSON Schema to SHACL Turtle with -i and -o flags"
SHACL_OUTPUT_FILE="$TEMP_DIR/test-shacl-output.ttl"
shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json -o "$SHACL_OUTPUT_FILE"

if [ ! -f "$SHACL_OUTPUT_FILE" ]; then
    echo -e "${RED}SHACL output file was not created${NC}"
    exit 1
fi

# Check that output contains SHACL vocabulary
if ! grep -q "shacl" "$SHACL_OUTPUT_FILE" 2>/dev/null; then
    echo -e "${RED}Output does not appear to be SHACL${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully converted JSON Schema to SHACL Turtle${NC}"
echo "  Output file size: $(wc -c < "$SHACL_OUTPUT_FILE") bytes"

echo ""
echo "Test 19: Convert JSON Schema to SHACL stdout (no -o flag)"
SHACL_STDOUT_OUTPUT=$(shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json)
if [ -z "$SHACL_STDOUT_OUTPUT" ]; then
    echo -e "${RED}SHACL stdout output is empty${NC}"
    exit 1
fi
if ! echo "$SHACL_STDOUT_OUTPUT" | grep -q "shacl" 2>/dev/null; then
    echo -e "${RED}Stdout output does not appear to be SHACL${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully output SHACL to stdout${NC}"

echo ""
echo "Test 20: to-shacl error handling - nonexistent file"
if shacl-bridge to-shacl -i nonexistent-file.json 2>/dev/null; then
    echo -e "${RED}Should have failed with nonexistent file${NC}"
    exit 1
fi
echo -e "${GREEN}to-shacl correctly handles nonexistent files${NC}"

echo ""
echo "Test 21: Convert JSON Schema to SHACL JSON-LD with --json-ld flag"
SHACL_JSONLD_OUTPUT_FILE="$TEMP_DIR/test-shacl-output.jsonld"
shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json --json-ld -o "$SHACL_JSONLD_OUTPUT_FILE"

if [ ! -f "$SHACL_JSONLD_OUTPUT_FILE" ]; then
    echo -e "${RED}SHACL JSON-LD output file was not created${NC}"
    exit 1
fi

# Validate JSON structure
if ! jq empty "$SHACL_JSONLD_OUTPUT_FILE" 2>/dev/null; then
    echo -e "${RED}SHACL JSON-LD output is not valid JSON${NC}"
    exit 1
fi

# Check that it contains @context (JSON-LD)
if ! jq -e '."@context"' "$SHACL_JSONLD_OUTPUT_FILE" > /dev/null 2>&1; then
    echo -e "${RED}SHACL JSON-LD output missing @context${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully converted JSON Schema to SHACL JSON-LD${NC}"
echo "  Output file size: $(wc -c < "$SHACL_JSONLD_OUTPUT_FILE") bytes"

echo ""
echo "Test 22: Convert JSON Schema to SHACL JSON-LD stdout"
SHACL_JSONLD_STDOUT=$(shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json --json-ld)
if ! echo "$SHACL_JSONLD_STDOUT" | jq empty 2>/dev/null; then
    echo -e "${RED}SHACL JSON-LD stdout output is not valid JSON${NC}"
    exit 1
fi
if ! echo "$SHACL_JSONLD_STDOUT" | jq -e '."@context"' > /dev/null 2>&1; then
    echo -e "${RED}SHACL JSON-LD stdout output missing @context${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully output SHACL JSON-LD to stdout${NC}"

echo ""
echo "Test 23: to-shacl with --base-uri flag"
BASE_URI_OUTPUT=$(shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json --base-uri "http://custom.example.org/shapes/")
if ! echo "$BASE_URI_OUTPUT" | grep -q "custom.example.org" 2>/dev/null; then
    echo -e "${RED}--base-uri flag did not affect output${NC}"
    exit 1
fi
echo -e "${GREEN}--base-uri flag works correctly${NC}"

echo ""
echo "Test 24: --schema-id sets \$id in output"
SCHEMA_ID_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --schema-id "https://example.com/my-schema")
if ! echo "$SCHEMA_ID_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}--schema-id output is not valid JSON${NC}"
    exit 1
fi
SCHEMA_ID_VALUE=$(echo "$SCHEMA_ID_OUTPUT" | jq -r '."$id"')
if [ "$SCHEMA_ID_VALUE" != "https://example.com/my-schema" ]; then
    echo -e "${RED}Expected \$id to be 'https://example.com/my-schema', got '$SCHEMA_ID_VALUE'${NC}"
    exit 1
fi
echo -e "${GREEN}--schema-id correctly sets \$id in output${NC}"

echo ""
echo "Test 25: Without --schema-id, \$id is absent"
NO_SCHEMA_ID_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl)
if echo "$NO_SCHEMA_ID_OUTPUT" | jq -e '."$id"' > /dev/null 2>&1; then
    echo -e "${RED}\$id should not be present when --schema-id is not specified${NC}"
    exit 1
fi
echo -e "${GREEN}\$id is correctly absent when --schema-id is not specified${NC}"

echo ""
echo "=== Round-trip Tests ==="

echo ""
echo "Test 26: SHACL -> JSON Schema -> SHACL round-trip"
ROUND_TRIP_DIR="$TEMP_DIR/round-trip"
mkdir -p "$ROUND_TRIP_DIR"

# Step 1: Convert SHACL to JSON Schema
shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl -o "$ROUND_TRIP_DIR/intermediate.json"

if [ ! -f "$ROUND_TRIP_DIR/intermediate.json" ]; then
    echo -e "${RED}Intermediate JSON Schema was not created${NC}"
    exit 1
fi

# Step 2: Convert JSON Schema back to SHACL
shacl-bridge to-shacl -i "$ROUND_TRIP_DIR/intermediate.json" -o "$ROUND_TRIP_DIR/roundtrip.ttl"

if [ ! -f "$ROUND_TRIP_DIR/roundtrip.ttl" ]; then
    echo -e "${RED}Round-trip SHACL was not created${NC}"
    exit 1
fi

# Verify round-trip output contains SHACL
if ! grep -q "shacl" "$ROUND_TRIP_DIR/roundtrip.ttl" 2>/dev/null; then
    echo -e "${RED}Round-trip output does not contain SHACL vocabulary${NC}"
    exit 1
fi

echo -e "${GREEN}Round-trip conversion completed successfully${NC}"

echo ""
echo "=== Compare Tests ==="

echo ""
echo "Test 27: compare --help flag"
COMPARE_HELP=$(shacl-bridge compare --help)
if [[ $COMPARE_HELP == *"compare"* ]] && [[ $COMPARE_HELP == *"--file1"* ]] && [[ $COMPARE_HELP == *"--file2"* ]]; then
    echo -e "${GREEN}compare help output is valid${NC}"
else
    echo -e "${RED}compare help output is invalid${NC}"
    exit 1
fi

echo ""
echo "Test 28: compare two different SHACL files"
COMPARE_OUTPUT=$(shacl-bridge compare --file1 samples/shacl/simple-shacl.ttl --file2 samples/shacl/cardinality-constraints.ttl)
if [[ $COMPARE_OUTPUT == *"Score:"* ]]; then
    echo -e "${GREEN}compare produces score output${NC}"
    echo "  Output: $(echo "$COMPARE_OUTPUT" | head -1)"
else
    echo -e "${RED}compare output missing Score${NC}"
    exit 1
fi

echo ""
echo "Test 29: compare a file to itself should yield 100% similarity"
SAME_FILE_OUTPUT=$(shacl-bridge compare --file1 samples/shacl/simple-shacl.ttl --file2 samples/shacl/simple-shacl.ttl)
if [[ $SAME_FILE_OUTPUT == *"100.0%"* ]]; then
    echo -e "${GREEN}Same-file comparison correctly yields 100% similarity${NC}"
else
    echo -e "${RED}Same-file comparison did not yield 100% similarity${NC}"
    echo "  Output: $SAME_FILE_OUTPUT"
    exit 1
fi

echo ""
echo "Test 30: compare with --shorten flag produces prefixed output"
SHORTEN_OUTPUT=$(shacl-bridge compare --file1 samples/shacl/simple-shacl.ttl --file2 samples/shacl/cardinality-constraints.ttl --shorten)
if [[ $SHORTEN_OUTPUT == *"Score:"* ]]; then
    echo -e "${GREEN}compare --shorten produces valid output${NC}"
else
    echo -e "${RED}compare --shorten output missing Score${NC}"
    exit 1
fi

echo ""
echo "Test 31: compare without required flags should fail"
if shacl-bridge compare 2>/dev/null; then
    echo -e "${RED}Should have failed without --file1 and --file2${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly requires --file1 and --file2 flags${NC}"

echo ""
echo "Test 32: compare with nonexistent file should fail"
if shacl-bridge compare --file1 nonexistent.ttl --file2 samples/shacl/simple-shacl.ttl 2>/dev/null; then
    echo -e "${RED}Should have failed with nonexistent file${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly handles nonexistent files${NC}"

echo ""
echo "=== Root Shape Tests ==="

echo ""
echo "Test 33: --root flag appears in to-json-schema help"
ROOT_HELP=$(shacl-bridge to-json-schema --help)
if [[ $ROOT_HELP == *"--root"* ]]; then
    echo -e "${GREEN}--root flag appears in help${NC}"
else
    echo -e "${RED}--root flag missing from help${NC}"
    exit 1
fi

echo ""
echo "Test 34: --root sets \$ref in output"
ROOT_OUTPUT=$(shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --root Person)
if ! echo "$ROOT_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}--root output is not valid JSON${NC}"
    exit 1
fi
ROOT_REF=$(echo "$ROOT_OUTPUT" | jq -r '."$ref"')
if [ "$ROOT_REF" != "#/\$defs/Person" ]; then
    echo -e "${RED}Expected \$ref to be '#/\$defs/Person', got '$ROOT_REF'${NC}"
    exit 1
fi
echo -e "${GREEN}--root correctly sets \$ref in output${NC}"

echo ""
echo "Test 35: --root with nonexistent shape should fail"
if shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --root NonExistentShape 2>/dev/null; then
    echo -e "${RED}Should have failed with nonexistent root shape${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly errors on nonexistent root shape${NC}"

echo ""
echo -e "${GREEN}All tests passed!${NC}"