# End-to-end CLI integration test for Windows
# This script installs the CLI and tests it like a real user would

$ErrorActionPreference = "Stop"

Write-Host "CLI Tests"
Write-Host ""

$OriginalDir = Get-Location
$TempDir = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "shacl-cli-test-$(Get-Random)")

function Cleanup {
    Write-Host ""
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    if (Test-Path $TempDir) {
        Remove-Item -Recurse -Force $TempDir
    }
    npm unlink -g shacl-bridge 2>$null
    Set-Location $OriginalDir
}

# Register cleanup
trap { Cleanup; break }

try {
    Write-Host "Running tsc"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }

    Write-Host ""
    Write-Host "Running npm link"
    npm link
    if ($LASTEXITCODE -ne 0) { throw "npm link failed" }

    Write-Host ""
    Write-Host "Checking if shacl-bridge is linked"
    $command = Get-Command shacl-bridge -ErrorAction SilentlyContinue
    if (-not $command) {
        Write-Host "shacl-bridge command not found after npm link" -ForegroundColor Red
        exit 1
    }
    Write-Host "shacl-bridge command is available" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 1: --version flag"
    $versionOutput = shacl-bridge --version
    Write-Host "Output: $versionOutput"
    if ($versionOutput -match '^\d+\.\d+\.\d+$') {
        Write-Host "Version output is valid" -ForegroundColor Green
    } else {
        Write-Host "Invalid version format" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 2: --help flag"
    $helpOutput = shacl-bridge --help
    if ($helpOutput -like "*Usage:*" -and $helpOutput -like "*shacl-bridge*") {
        Write-Host "Help output is valid" -ForegroundColor Green
    } else {
        Write-Host "Help output is invalid" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 3: to-json-schema --help flag"
    $toJsonSchemaHelp = shacl-bridge to-json-schema --help
    if ($toJsonSchemaHelp -like "*to-json-schema*" -and $toJsonSchemaHelp -like "*--input*") {
        Write-Host "to-json-schema help output is valid" -ForegroundColor Green
    } else {
        Write-Host "to-json-schema help output is invalid" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 4: to-shacl --help flag"
    $toShaclHelp = shacl-bridge to-shacl --help
    if ($toShaclHelp -like "*to-shacl*" -and $toShaclHelp -like "*--input*") {
        Write-Host "to-shacl help output is valid" -ForegroundColor Green
    } else {
        Write-Host "to-shacl help output is invalid" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "=== SHACL to JSON Schema Tests ==="

    Write-Host ""
    Write-Host "Test 5: Convert cardinality-constraints.ttl with -i and -o flags"
    $outputFile = Join-Path $TempDir "test-output.json"
    shacl-bridge to-json-schema -i samples/shacl/cardinality-constraints.ttl -o $outputFile
    if ($LASTEXITCODE -ne 0) { throw "Conversion failed" }

    if (-not (Test-Path $outputFile)) {
        Write-Host "Output file was not created" -ForegroundColor Red
        exit 1
    }

    # Validate JSON structure
    try {
        $jsonContent = Get-Content $outputFile -Raw | ConvertFrom-Json
    } catch {
        Write-Host "Output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    if ($jsonContent.'$schema' -ne "https://json-schema.org/draft/2020-12/schema") {
        Write-Host "Invalid schema version" -ForegroundColor Red
        exit 1
    }

    $defsCount = ($jsonContent.'$defs' | Get-Member -MemberType NoteProperty).Count
    if ($defsCount -lt 1) {
        Write-Host "No definitions found in output" -ForegroundColor Red
        exit 1
    }

    Write-Host "Successfully converted SHACL to JSON Schema" -ForegroundColor Green
    $fileSize = (Get-Item $outputFile).Length
    Write-Host "  Output file size: $fileSize bytes"
    Write-Host "  Number of definitions: $defsCount"

    Write-Host ""
    Write-Host "Test 6: Convert to stdout (no -o flag)"
    $stdoutOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl
    if ($LASTEXITCODE -ne 0) { throw "Stdout conversion failed" }

    try {
        $stdoutOutput | ConvertFrom-Json | Out-Null
        Write-Host "Successfully output JSON to stdout" -ForegroundColor Green
    } catch {
        Write-Host "Stdout output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 7: Error handling - nonexistent file"
    $errorOccurred = $false
    try {
        shacl-bridge to-json-schema -i nonexistent-file.ttl 2>$null
        if ($LASTEXITCODE -eq 0) {
            $errorOccurred = $false
        } else {
            $errorOccurred = $true
        }
    } catch {
        $errorOccurred = $true
    }

    if (-not $errorOccurred) {
        Write-Host "Should have failed with nonexistent file" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly handles nonexistent files" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 8: Convert JSON-LD file with --json-ld flag"
    $jsonLdOutputFile = Join-Path $TempDir "test-jsonld-output.json"
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.jsonld --json-ld -o $jsonLdOutputFile
    if ($LASTEXITCODE -ne 0) { throw "JSON-LD conversion failed" }

    if (-not (Test-Path $jsonLdOutputFile)) {
        Write-Host "JSON-LD output file was not created" -ForegroundColor Red
        exit 1
    }

    # Validate JSON structure
    try {
        $jsonLdContent = Get-Content $jsonLdOutputFile -Raw | ConvertFrom-Json
    } catch {
        Write-Host "JSON-LD output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    if ($jsonLdContent.'$schema' -ne "https://json-schema.org/draft/2020-12/schema") {
        Write-Host "Invalid schema version in JSON-LD output" -ForegroundColor Red
        exit 1
    }

    $jsonLdDefsCount = ($jsonLdContent.'$defs' | Get-Member -MemberType NoteProperty).Count
    if ($jsonLdDefsCount -lt 1) {
        Write-Host "No definitions found in JSON-LD output" -ForegroundColor Red
        exit 1
    }

    Write-Host "Successfully converted JSON-LD to JSON Schema" -ForegroundColor Green
    $jsonLdFileSize = (Get-Item $jsonLdOutputFile).Length
    Write-Host "  Output file size: $jsonLdFileSize bytes"
    Write-Host "  Number of definitions: $jsonLdDefsCount"

    Write-Host ""
    Write-Host "Test 9: Convert JSON-LD to stdout with --json-ld flag"
    $jsonLdStdoutOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.jsonld --json-ld
    if ($LASTEXITCODE -ne 0) { throw "JSON-LD stdout conversion failed" }

    try {
        $jsonLdStdoutOutput | ConvertFrom-Json | Out-Null
        Write-Host "Successfully output JSON-LD conversion to stdout" -ForegroundColor Green
    } catch {
        Write-Host "JSON-LD stdout output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 10: --mode single (explicit)"
    $singleModeOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode single
    if ($LASTEXITCODE -ne 0) { throw "Single mode conversion failed" }

    try {
        $singleModeJson = $singleModeOutput | ConvertFrom-Json
        if (-not $singleModeJson.'$defs') {
            Write-Host "Single mode output missing `$defs" -ForegroundColor Red
            exit 1
        }
        Write-Host "Single mode works correctly" -ForegroundColor Green
    } catch {
        Write-Host "Single mode output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 11: --mode multi creates individual files"
    $multiOutputDir = Join-Path $TempDir "multi-output"
    New-Item -ItemType Directory -Path $multiOutputDir -Force | Out-Null
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode multi -o $multiOutputDir
    if ($LASTEXITCODE -ne 0) { throw "Multi mode conversion failed" }

    $jsonFiles = Get-ChildItem -Path $multiOutputDir -Filter "*.json"
    if ($jsonFiles.Count -lt 1) {
        Write-Host "No JSON files created in multi mode" -ForegroundColor Red
        exit 1
    }

    $personFile = Join-Path $multiOutputDir "Person.json"
    if (-not (Test-Path $personFile)) {
        Write-Host "Person.json not created in multi mode" -ForegroundColor Red
        exit 1
    }

    try {
        $personContent = Get-Content $personFile -Raw | ConvertFrom-Json
        if ($personContent.'$schema' -ne "https://json-schema.org/draft/2020-12/schema") {
            Write-Host "Invalid schema version in Person.json" -ForegroundColor Red
            exit 1
        }
        Write-Host "Multi mode creates individual files correctly" -ForegroundColor Green
        Write-Host "  Files created: $($jsonFiles.Count)"
    } catch {
        Write-Host "Person.json is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 12: --mode multi converts `$ref to external file references"
    $multiRefDir = Join-Path $TempDir "multi-ref-output"
    New-Item -ItemType Directory -Path $multiRefDir -Force | Out-Null
    shacl-bridge to-json-schema -i samples/shacl/complex-shacl.ttl --mode multi -o $multiRefDir
    if ($LASTEXITCODE -ne 0) { throw "Multi mode ref conversion failed" }

    $refFiles = Get-ChildItem -Path $multiRefDir -Filter "*.json"
    foreach ($file in $refFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match '#/\$defs/') {
            Write-Host "File $($file.Name) still contains internal `$defs reference" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "Multi mode correctly converts `$ref to external file references" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 13: --mode multi without -o should fail"
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode multi 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Should have failed when using multi mode without -o" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly requires -o flag for multi mode" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 14: --mode with invalid value should fail"
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode invalid 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Should have failed with invalid mode value" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly rejects invalid mode values" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 15: x-shacl-prefixes is absent by default"
    $defaultOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl
    if ($LASTEXITCODE -ne 0)
    {
        throw "Default conversion failed"
    }

    try {
        $defaultJson = $defaultOutput | ConvertFrom-Json
        if ($defaultJson.'x-shacl-prefixes')
        {
            Write-Host "x-shacl-prefixes should not be present by default" -ForegroundColor Red
            exit 1
        }
        if (-not $defaultJson.'$schema')
        {
            Write-Host "Output should still have `$schema" -ForegroundColor Red
            exit 1
        }
        Write-Host "x-shacl-prefixes is correctly absent by default" -ForegroundColor Green
    } catch {
        Write-Host "Default output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 16: --include-shacl-extensions includes x-shacl-prefixes"
    $includeExtOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --include-shacl-extensions
    if ($LASTEXITCODE -ne 0)
    {
        throw "Include extensions conversion failed"
    }

    try {
        $includeExtJson = $includeExtOutput | ConvertFrom-Json
        if (-not $includeExtJson.'x-shacl-prefixes')
        {
            Write-Host "x-shacl-prefixes should be present with --include-shacl-extensions" -ForegroundColor Red
            exit 1
        }
        Write-Host "--include-shacl-extensions correctly includes x-shacl-prefixes" -ForegroundColor Green
    } catch {
        Write-Host "Include extensions output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 17: --include-shacl-extensions works with --mode multi"
    $multiIncludeDir = Join-Path $TempDir "multi-include-output"
    New-Item -ItemType Directory -Path $multiIncludeDir -Force | Out-Null
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --mode multi -o $multiIncludeDir --include-shacl-extensions
    if ($LASTEXITCODE -ne 0)
    {
        throw "Multi mode with include extensions failed"
    }

    $personIncludeFile = Join-Path $multiIncludeDir "Person.json"
    if (-not (Test-Path $personIncludeFile))
    {
        Write-Host "Person.json not created in multi mode with --include-shacl-extensions" -ForegroundColor Red
        exit 1
    }

    try {
        $personIncludeContent = Get-Content $personIncludeFile -Raw | ConvertFrom-Json
        if (-not $personIncludeContent.'x-shacl-prefixes')
        {
            Write-Host "x-shacl-prefixes should be present in multi mode with --include-shacl-extensions" -ForegroundColor Red
            exit 1
        }
        Write-Host "--include-shacl-extensions works correctly with --mode multi" -ForegroundColor Green
    } catch {
        Write-Host "Person.json is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "=== JSON Schema to SHACL Tests ==="

    Write-Host ""
    Write-Host "Test 18: Convert JSON Schema to SHACL Turtle with -i and -o flags"
    $shaclOutputFile = Join-Path $TempDir "test-shacl-output.ttl"
    shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json -o $shaclOutputFile
    if ($LASTEXITCODE -ne 0) { throw "JSON Schema to SHACL conversion failed" }

    if (-not (Test-Path $shaclOutputFile)) {
        Write-Host "SHACL output file was not created" -ForegroundColor Red
        exit 1
    }

    $shaclContent = Get-Content $shaclOutputFile -Raw
    if ($shaclContent -notlike "*shacl*") {
        Write-Host "Output does not appear to be SHACL" -ForegroundColor Red
        exit 1
    }

    Write-Host "Successfully converted JSON Schema to SHACL Turtle" -ForegroundColor Green
    $shaclFileSize = (Get-Item $shaclOutputFile).Length
    Write-Host "  Output file size: $shaclFileSize bytes"

    Write-Host ""
    Write-Host "Test 19: Convert JSON Schema to SHACL stdout (no -o flag)"
    $shaclStdoutOutput = shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json
    if ($LASTEXITCODE -ne 0) { throw "SHACL stdout conversion failed" }

    $shaclStdoutString = $shaclStdoutOutput -join "`n"
    if ([string]::IsNullOrWhiteSpace($shaclStdoutString)) {
        Write-Host "SHACL stdout output is empty" -ForegroundColor Red
        exit 1
    }
    if ($shaclStdoutString -notlike "*shacl*") {
        Write-Host "Stdout output does not appear to be SHACL" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully output SHACL to stdout" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 20: to-shacl error handling - nonexistent file"
    $shaclErrorOccurred = $false
    try {
        shacl-bridge to-shacl -i nonexistent-file.json 2>$null
        if ($LASTEXITCODE -eq 0) {
            $shaclErrorOccurred = $false
        } else {
            $shaclErrorOccurred = $true
        }
    } catch {
        $shaclErrorOccurred = $true
    }

    if (-not $shaclErrorOccurred) {
        Write-Host "Should have failed with nonexistent file" -ForegroundColor Red
        exit 1
    }
    Write-Host "to-shacl correctly handles nonexistent files" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 21: Convert JSON Schema to SHACL JSON-LD with --json-ld flag"
    $shaclJsonLdOutputFile = Join-Path $TempDir "test-shacl-output.jsonld"
    shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json --json-ld -o $shaclJsonLdOutputFile
    if ($LASTEXITCODE -ne 0) { throw "SHACL JSON-LD conversion failed" }

    if (-not (Test-Path $shaclJsonLdOutputFile)) {
        Write-Host "SHACL JSON-LD output file was not created" -ForegroundColor Red
        exit 1
    }

    try {
        $shaclJsonLdContent = Get-Content $shaclJsonLdOutputFile -Raw | ConvertFrom-Json
        if (-not $shaclJsonLdContent.'@context') {
            Write-Host "SHACL JSON-LD output missing @context" -ForegroundColor Red
            exit 1
        }
        Write-Host "Successfully converted JSON Schema to SHACL JSON-LD" -ForegroundColor Green
        $shaclJsonLdFileSize = (Get-Item $shaclJsonLdOutputFile).Length
        Write-Host "  Output file size: $shaclJsonLdFileSize bytes"
    } catch {
        Write-Host "SHACL JSON-LD output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 22: Convert JSON Schema to SHACL JSON-LD stdout"
    $shaclJsonLdStdout = shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json --json-ld
    if ($LASTEXITCODE -ne 0) { throw "SHACL JSON-LD stdout conversion failed" }

    try {
        $shaclJsonLdStdoutJson = $shaclJsonLdStdout | ConvertFrom-Json
        if (-not $shaclJsonLdStdoutJson.'@context') {
            Write-Host "SHACL JSON-LD stdout output missing @context" -ForegroundColor Red
            exit 1
        }
        Write-Host "Successfully output SHACL JSON-LD to stdout" -ForegroundColor Green
    } catch {
        Write-Host "SHACL JSON-LD stdout output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 23: to-shacl with --base-uri flag"
    $baseUriOutput = shacl-bridge to-shacl -i samples/json-schema/complex-system-config.json --base-uri "http://custom.example.org/shapes/"
    if ($LASTEXITCODE -ne 0) { throw "Base URI conversion failed" }

    $baseUriString = $baseUriOutput -join "`n"
    if ($baseUriString -notlike "*custom.example.org*") {
        Write-Host "--base-uri flag did not affect output" -ForegroundColor Red
        exit 1
    }
    Write-Host "--base-uri flag works correctly" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 24: --schema-id sets `$id in output"
    $schemaIdOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --schema-id "https://example.com/my-schema"
    if ($LASTEXITCODE -ne 0)
    {
        throw "--schema-id conversion failed"
    }

    try
    {
        $schemaIdJson = $schemaIdOutput | ConvertFrom-Json
        if ($schemaIdJson.'$id' -ne "https://example.com/my-schema")
        {
            Write-Host "Expected `$id to be 'https://example.com/my-schema', got '$( $schemaIdJson.'$id' )'" -ForegroundColor Red
            exit 1
        }
        Write-Host "--schema-id correctly sets `$id in output" -ForegroundColor Green
    }
    catch
    {
        Write-Host "--schema-id output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 25: Without --schema-id, `$id is absent"
    $noSchemaIdOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl
    if ($LASTEXITCODE -ne 0)
    {
        throw "Default conversion failed"
    }

    try
    {
        $noSchemaIdJson = $noSchemaIdOutput | ConvertFrom-Json
        if ($null -ne $noSchemaIdJson.'$id')
        {
            Write-Host "`$id should not be present when --schema-id is not specified" -ForegroundColor Red
            exit 1
        }
        Write-Host "`$id is correctly absent when --schema-id is not specified" -ForegroundColor Green
    }
    catch
    {
        Write-Host "Output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "=== Round-trip Tests ==="

    Write-Host ""
    Write-Host "Test 26: SHACL -> JSON Schema -> SHACL round-trip"
    $roundTripDir = Join-Path $TempDir "round-trip"
    New-Item -ItemType Directory -Path $roundTripDir -Force | Out-Null

    # Step 1: Convert SHACL to JSON Schema
    $intermediateFile = Join-Path $roundTripDir "intermediate.json"
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl -o $intermediateFile
    if ($LASTEXITCODE -ne 0) { throw "Round-trip step 1 failed" }

    if (-not (Test-Path $intermediateFile)) {
        Write-Host "Intermediate JSON Schema was not created" -ForegroundColor Red
        exit 1
    }

    # Step 2: Convert JSON Schema back to SHACL
    $roundTripFile = Join-Path $roundTripDir "roundtrip.ttl"
    shacl-bridge to-shacl -i $intermediateFile -o $roundTripFile
    if ($LASTEXITCODE -ne 0) { throw "Round-trip step 2 failed" }

    if (-not (Test-Path $roundTripFile)) {
        Write-Host "Round-trip SHACL was not created" -ForegroundColor Red
        exit 1
    }

    $roundTripContent = Get-Content $roundTripFile -Raw
    if ($roundTripContent -notlike "*shacl*") {
        Write-Host "Round-trip output does not contain SHACL vocabulary" -ForegroundColor Red
        exit 1
    }

    Write-Host "Round-trip conversion completed successfully" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== Compare Tests ==="

    Write-Host ""
    Write-Host "Test 27: compare --help flag"
    $compareHelp = shacl-bridge compare --help
    if ($compareHelp -like "*compare*" -and $compareHelp -like "*--expected*" -and $compareHelp -like "*--actual*")
    {
        Write-Host "compare help output is valid" -ForegroundColor Green
    }
    else
    {
        Write-Host "compare help output is invalid" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 28: compare two different SHACL files"
    $compareOutput = shacl-bridge compare --expected samples/shacl/simple-shacl.ttl --actual samples/shacl/cardinality-constraints.ttl
    if ($LASTEXITCODE -ne 0)
    {
        throw "compare command failed"
    }
    $compareString = $compareOutput -join "`n"
    if ($compareString -like "*F1:*")
    {
        Write-Host "compare produces F1 output" -ForegroundColor Green
        Write-Host "  Output: $( $compareOutput | Select-Object -First 1 )"
    }
    else
    {
        Write-Host "compare output missing F1" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 29: compare a file to itself should yield F1=1"
    $sameFileOutput = shacl-bridge compare --expected samples/shacl/simple-shacl.ttl --actual samples/shacl/simple-shacl.ttl
    if ($LASTEXITCODE -ne 0)
    {
        throw "same-file compare failed"
    }
    $sameFileString = $sameFileOutput -join "`n"
    if ($sameFileString -like "*F1: 1.0000*")
    {
        Write-Host "Same-file comparison correctly yields F1=1" -ForegroundColor Green
    }
    else
    {
        Write-Host "Same-file comparison did not yield F1=1" -ForegroundColor Red
        Write-Host "  Output: $sameFileString"
        exit 1
    }

    Write-Host ""
    Write-Host "Test 30: compare with --shorten flag produces prefixed output"
    $shortenOutput = shacl-bridge compare --expected samples/shacl/simple-shacl.ttl --actual samples/shacl/cardinality-constraints.ttl --shorten
    if ($LASTEXITCODE -ne 0)
    {
        throw "compare --shorten failed"
    }
    $shortenString = $shortenOutput -join "`n"
    if ($shortenString -like "*F1:*")
    {
        Write-Host "compare --shorten produces valid output" -ForegroundColor Green
    }
    else
    {
        Write-Host "compare --shorten output missing F1" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 31: compare without required flags should fail"
    shacl-bridge compare 2> $null
    if ($LASTEXITCODE -eq 0)
    {
        Write-Host "Should have failed without --expected and --actual" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly requires --expected and --actual flags" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 32: compare with nonexistent file should fail"
    shacl-bridge compare --expected nonexistent.ttl --actual samples/shacl/simple-shacl.ttl 2> $null
    if ($LASTEXITCODE -eq 0)
    {
        Write-Host "Should have failed with nonexistent file" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly handles nonexistent files" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== Root Shape Tests ==="

    Write-Host ""
    Write-Host "Test 33: --root flag appears in to-json-schema help"
    $rootHelp = shacl-bridge to-json-schema --help
    if ($rootHelp -like "*--root*")
    {
        Write-Host "--root flag appears in help" -ForegroundColor Green
    }
    else
    {
        Write-Host "--root flag missing from help" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 34: --root sets `$ref in output"
    $rootOutput = shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --root Person
    if ($LASTEXITCODE -ne 0)
    {
        throw "--root conversion failed"
    }

    try
    {
        $rootJson = $rootOutput | ConvertFrom-Json
        if ($rootJson.'$ref' -ne '#/$defs/Person')
        {
            Write-Host "Expected `$ref to be '#/`$defs/Person', got '$( $rootJson.'$ref' )'" -ForegroundColor Red
            exit 1
        }
        Write-Host "--root correctly sets `$ref in output" -ForegroundColor Green
    }
    catch
    {
        Write-Host "--root output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 35: --root with nonexistent shape should fail"
    shacl-bridge to-json-schema -i samples/shacl/simple-shacl.ttl --root NonExistentShape 2> $null
    if ($LASTEXITCODE -eq 0)
    {
        Write-Host "Should have failed with nonexistent root shape" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly errors on nonexistent root shape" -ForegroundColor Green

    Write-Host ""
    Write-Host "All tests passed!" -ForegroundColor Green

} finally {
    Cleanup
}