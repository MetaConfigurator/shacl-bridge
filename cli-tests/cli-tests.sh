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
echo "Test 3: Convert cardinality-constraints.ttl with -i and -o flags"
OUTPUT_FILE="$TEMP_DIR/test-output.json"
shacl-bridge -i samples/shacl/cardinality-constraints.ttl -o "$OUTPUT_FILE"

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
echo "Test 4: Convert to stdout (no -o flag)"
STDOUT_OUTPUT=$(shacl-bridge -i samples/shacl/simple-shacl.ttl)
if ! echo "$STDOUT_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}Stdout output is not valid JSON${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully output JSON to stdout${NC}"

echo ""
echo "Test 5: Error handling - nonexistent file"
if shacl-bridge -i nonexistent-file.ttl 2>/dev/null; then
    echo -e "${RED}Should have failed with nonexistent file${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly handles nonexistent files${NC}"

echo ""
echo "Test 6: Convert JSON-LD file with --json-ld flag"
JSONLD_OUTPUT_FILE="$TEMP_DIR/test-jsonld-output.json"
shacl-bridge -i samples/shacl/simple-shacl.jsonld --json-ld -o "$JSONLD_OUTPUT_FILE"

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
echo "Test 7: Convert JSON-LD to stdout with --json-ld flag"
JSONLD_STDOUT_OUTPUT=$(shacl-bridge -i samples/shacl/simple-shacl.jsonld --json-ld)
if ! echo "$JSONLD_STDOUT_OUTPUT" | jq empty 2>/dev/null; then
    echo -e "${RED}JSON-LD stdout output is not valid JSON${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully output JSON-LD conversion to stdout${NC}"

echo ""
echo "Test 8: --mode single (explicit)"
SINGLE_MODE_OUTPUT=$(shacl-bridge -i samples/shacl/simple-shacl.ttl --mode single)
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
echo "Test 9: --mode multi creates individual files"
MULTI_OUTPUT_DIR="$TEMP_DIR/multi-output"
mkdir -p "$MULTI_OUTPUT_DIR"
shacl-bridge -i samples/shacl/simple-shacl.ttl --mode multi -o "$MULTI_OUTPUT_DIR"

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
echo "Test 10: --mode multi converts \$ref to external file references"
MULTI_REF_DIR="$TEMP_DIR/multi-ref-output"
mkdir -p "$MULTI_REF_DIR"
shacl-bridge -i samples/shacl/complex-shacl.ttl --mode multi -o "$MULTI_REF_DIR"

# Check that no file contains internal $defs references
for file in "$MULTI_REF_DIR"/*.json; do
    if grep -q '#/\$defs/' "$file" 2>/dev/null; then
        echo -e "${RED}File $file still contains internal \$defs reference${NC}"
        exit 1
    fi
done
echo -e "${GREEN}Multi mode correctly converts \$ref to external file references${NC}"

echo ""
echo "Test 11: --mode multi without -o should fail"
if shacl-bridge -i samples/shacl/simple-shacl.ttl --mode multi 2>/dev/null; then
    echo -e "${RED}Should have failed when using multi mode without -o${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly requires -o flag for multi mode${NC}"

echo ""
echo "Test 12: --mode with invalid value should fail"
if shacl-bridge -i samples/shacl/simple-shacl.ttl --mode invalid 2>/dev/null; then
    echo -e "${RED}Should have failed with invalid mode value${NC}"
    exit 1
fi
echo -e "${GREEN}Correctly rejects invalid mode values${NC}"

echo ""
echo "Test 13: --exclude-shacl-extensions excludes x-shacl-prefixes"
EXCLUDE_EXT_OUTPUT=$(shacl-bridge -i samples/shacl/simple-shacl.ttl --exclude-shacl-extensions)
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
echo "Test 14: Without --exclude-shacl-extensions, x-shacl-prefixes is present"
DEFAULT_OUTPUT=$(shacl-bridge -i samples/shacl/simple-shacl.ttl)
if ! echo "$DEFAULT_OUTPUT" | jq -e '."x-shacl-prefixes"' > /dev/null 2>&1; then
    echo -e "${RED}x-shacl-prefixes should be present by default${NC}"
    exit 1
fi
echo -e "${GREEN}x-shacl-prefixes is present by default${NC}"

echo ""
echo "Test 15: --exclude-shacl-extensions works with --mode multi"
MULTI_EXCLUDE_DIR="$TEMP_DIR/multi-exclude-output"
mkdir -p "$MULTI_EXCLUDE_DIR"
shacl-bridge -i samples/shacl/simple-shacl.ttl --mode multi -o "$MULTI_EXCLUDE_DIR" --exclude-shacl-extensions

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
echo -e "${GREEN}All tests passed!${NC}"