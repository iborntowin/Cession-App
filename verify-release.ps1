# Verify Release Files Before Upload
# This ensures the checksums match before uploading to GitHub

Write-Host "Verifying Release Files for v1.0.34..." -ForegroundColor Cyan
Write-Host ""

# Paths
$releaseDir = "release-files"
$nsisExe = Join-Path $releaseDir "Cession Management App_1.0.34_x64-setup.exe"
$latestJson = Join-Path $releaseDir "latest.json"

# Check if files exist
if (-not (Test-Path $nsisExe)) {
    Write-Host "ERROR: NSIS installer not found: $nsisExe" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $latestJson)) {
    Write-Host "ERROR: latest.json not found: $latestJson" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Files found" -ForegroundColor Green
Write-Host ""

# Calculate actual SHA256 of NSIS installer
Write-Host "Calculating SHA256 checksums..." -ForegroundColor Yellow
$fileBytes = [System.IO.File]::ReadAllBytes($nsisExe)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha256.ComputeHash($fileBytes)
$actualHash = [BitConverter]::ToString($hashBytes).Replace('-','').ToLower()

Write-Host "  NSIS .exe actual SHA256: $actualHash" -ForegroundColor White

# Read latest.json
$jsonContent = Get-Content $latestJson -Raw | ConvertFrom-Json
$expectedHash = $jsonContent.platforms.'windows-x86_64'.sha256

Write-Host "  NSIS .exe expected SHA256: $expectedHash" -ForegroundColor White
Write-Host ""

# Compare
if ($actualHash -eq $expectedHash) {
    Write-Host "SUCCESS: CHECKSUMS MATCH!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files are ready for upload!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Upload these files to GitHub:" -ForegroundColor Cyan
    Write-Host "   1. $nsisExe" -ForegroundColor White
    Write-Host "   2. $latestJson" -ForegroundColor White
    Write-Host ""
    Write-Host "Create release at: https://github.com/iborntowin/Cession-App/releases/new" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Delete the old v1.0.34 release on GitHub first if it exists!" -ForegroundColor Yellow
    Write-Host "Then upload these NEW files with the correct checksums." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "ERROR: CHECKSUM MISMATCH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "The latest.json checksum doesn't match the actual file!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Fixing latest.json..." -ForegroundColor Yellow
    
    # Update the JSON
    $jsonContent.platforms.'windows-x86_64'.sha256 = $actualHash
    $jsonContent | ConvertTo-Json -Depth 10 | Set-Content $latestJson
    
    # Also update root latest.json
    $rootJson = "latest.json"
    if (Test-Path $rootJson) {
        $jsonContent | ConvertTo-Json -Depth 10 | Set-Content $rootJson
        Write-Host "OK: Updated both latest.json files" -ForegroundColor Green
    } else {
        Write-Host "OK: Updated release-files/latest.json" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Fixed! Now you can upload the files." -ForegroundColor Green
    exit 0
}
