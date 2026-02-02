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
    Write-Host "Test 3: Convert cardinality-constraints.ttl with -i and -o flags"
    $outputFile = Join-Path $TempDir "test-output.json"
    shacl-bridge -i samples/shacl/cardinality-constraints.ttl -o $outputFile
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
    Write-Host "Test 4: Convert to stdout (no -o flag)"
    $stdoutOutput = shacl-bridge -i samples/shacl/simple-shacl.ttl
    if ($LASTEXITCODE -ne 0) { throw "Stdout conversion failed" }

    try {
        $stdoutOutput | ConvertFrom-Json | Out-Null
        Write-Host "Successfully output JSON to stdout" -ForegroundColor Green
    } catch {
        Write-Host "Stdout output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 5: Error handling - nonexistent file"
    $errorOccurred = $false
    try {
        shacl-bridge -i nonexistent-file.ttl 2>$null
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
    Write-Host "Test 6: Convert JSON-LD file with --json-ld flag"
    $jsonLdOutputFile = Join-Path $TempDir "test-jsonld-output.json"
    shacl-bridge -i samples/shacl/simple-shacl.jsonld --json-ld -o $jsonLdOutputFile
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
    Write-Host "Test 7: Convert JSON-LD to stdout with --json-ld flag"
    $jsonLdStdoutOutput = shacl-bridge -i samples/shacl/simple-shacl.jsonld --json-ld
    if ($LASTEXITCODE -ne 0) { throw "JSON-LD stdout conversion failed" }

    try {
        $jsonLdStdoutOutput | ConvertFrom-Json | Out-Null
        Write-Host "Successfully output JSON-LD conversion to stdout" -ForegroundColor Green
    } catch {
        Write-Host "JSON-LD stdout output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 8: --mode single (explicit)"
    $singleModeOutput = shacl-bridge -i samples/shacl/simple-shacl.ttl --mode single
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
    Write-Host "Test 9: --mode multi creates individual files"
    $multiOutputDir = Join-Path $TempDir "multi-output"
    New-Item -ItemType Directory -Path $multiOutputDir -Force | Out-Null
    shacl-bridge -i samples/shacl/simple-shacl.ttl --mode multi -o $multiOutputDir
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
    Write-Host "Test 10: --mode multi converts `$ref to external file references"
    $multiRefDir = Join-Path $TempDir "multi-ref-output"
    New-Item -ItemType Directory -Path $multiRefDir -Force | Out-Null
    shacl-bridge -i samples/shacl/complex-shacl.ttl --mode multi -o $multiRefDir
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
    Write-Host "Test 11: --mode multi without -o should fail"
    shacl-bridge -i samples/shacl/simple-shacl.ttl --mode multi 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Should have failed when using multi mode without -o" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly requires -o flag for multi mode" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 12: --mode with invalid value should fail"
    shacl-bridge -i samples/shacl/simple-shacl.ttl --mode invalid 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Should have failed with invalid mode value" -ForegroundColor Red
        exit 1
    }
    Write-Host "Correctly rejects invalid mode values" -ForegroundColor Green

    Write-Host ""
    Write-Host "Test 13: --exclude-shacl-extensions excludes x-shacl-prefixes"
    $excludeExtOutput = shacl-bridge -i samples/shacl/simple-shacl.ttl --exclude-shacl-extensions
    if ($LASTEXITCODE -ne 0) { throw "Exclude extensions conversion failed" }

    try {
        $excludeExtJson = $excludeExtOutput | ConvertFrom-Json
        if ($excludeExtJson.'x-shacl-prefixes') {
            Write-Host "x-shacl-prefixes should not be present with --exclude-shacl-extensions" -ForegroundColor Red
            exit 1
        }
        if (-not $excludeExtJson.'$schema') {
            Write-Host "Output should still have `$schema" -ForegroundColor Red
            exit 1
        }
        Write-Host "--exclude-shacl-extensions correctly excludes x-shacl-prefixes" -ForegroundColor Green
    } catch {
        Write-Host "Exclude extensions output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 14: Without --exclude-shacl-extensions, x-shacl-prefixes is present"
    $defaultOutput = shacl-bridge -i samples/shacl/simple-shacl.ttl
    if ($LASTEXITCODE -ne 0) { throw "Default conversion failed" }

    try {
        $defaultJson = $defaultOutput | ConvertFrom-Json
        if (-not $defaultJson.'x-shacl-prefixes') {
            Write-Host "x-shacl-prefixes should be present by default" -ForegroundColor Red
            exit 1
        }
        Write-Host "x-shacl-prefixes is present by default" -ForegroundColor Green
    } catch {
        Write-Host "Default output is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Test 15: --exclude-shacl-extensions works with --mode multi"
    $multiExcludeDir = Join-Path $TempDir "multi-exclude-output"
    New-Item -ItemType Directory -Path $multiExcludeDir -Force | Out-Null
    shacl-bridge -i samples/shacl/simple-shacl.ttl --mode multi -o $multiExcludeDir --exclude-shacl-extensions
    if ($LASTEXITCODE -ne 0) { throw "Multi mode with exclude extensions failed" }

    $personExcludeFile = Join-Path $multiExcludeDir "Person.json"
    if (-not (Test-Path $personExcludeFile)) {
        Write-Host "Person.json not created in multi mode with --exclude-shacl-extensions" -ForegroundColor Red
        exit 1
    }

    try {
        $personExcludeContent = Get-Content $personExcludeFile -Raw | ConvertFrom-Json
        if ($personExcludeContent.'x-shacl-prefixes') {
            Write-Host "x-shacl-prefixes should not be present in multi mode with --exclude-shacl-extensions" -ForegroundColor Red
            exit 1
        }
        Write-Host "--exclude-shacl-extensions works correctly with --mode multi" -ForegroundColor Green
    } catch {
        Write-Host "Person.json is not valid JSON" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "All tests passed!" -ForegroundColor Green

} finally {
    Cleanup
}