# Sign the update bundle for Tauri auto-updates
# This script signs the .msi.zip file with your private key

$ErrorActionPreference = "Stop"

# Paths
$msiDir = "C:\Projects\Cession-App\frontend\src-tauri\target\release\bundle\msi"
$msiZip = "Cession-Management-App_1.0.0_x64_en-US.msi.zip"
$keyFile = "C:\Users\nassi\.tauri\cession-app.key"
$password = "Iborntowin#1"

Write-Host "🔐 Signing update bundle..." -ForegroundColor Cyan

# Change to MSI directory
Set-Location $msiDir

# Check if the .msi.zip exists
if (-not (Test-Path $msiZip)) {
    Write-Host "❌ Error: $msiZip not found!" -ForegroundColor Red
    exit 1
}

# Check if key file exists
if (-not (Test-Path $keyFile)) {
    Write-Host "❌ Error: Private key not found at $keyFile" -ForegroundColor Red
    exit 1
}

# Sign the file using tauri signer with the key file
Write-Host "Signing $msiZip..." -ForegroundColor Yellow

# Create a temporary response file for the password
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $password -NoNewline

try {
    # Run the signer with password from file
    Get-Content $tempFile | npx tauri signer sign $msiZip -k $keyFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully signed $msiZip" -ForegroundColor Green
        
        # Check if .sig file was created
        $sigFile = "$msiZip.sig"
        if (Test-Path $sigFile) {
            Write-Host "✅ Signature file created: $sigFile" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Warning: Signature file not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Signing failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} finally {
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "📦 Files ready for GitHub Release:" -ForegroundColor Cyan
Write-Host "  1. latest.json (generate with: node scripts/create-update-manifest.js)"
Write-Host "  2. $msiZip"
Write-Host "  3. $msiZip.sig"
