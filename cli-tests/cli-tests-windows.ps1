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
    Write-Host "All tests passed!" -ForegroundColor Green

} finally {
    Cleanup
}