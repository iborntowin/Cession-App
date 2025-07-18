#!/usr/bin/env pwsh
# Simple Deployment Package Creator

Write-Host "Creating deployment package..." -ForegroundColor Cyan

# Create dist directory
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
}
New-Item -ItemType Directory -Path "dist" -Force | Out-Null

# Copy main executable
$exePath = "frontend/src-tauri/target/release/cession-app-frontend.exe"
if (Test-Path $exePath) {
    Copy-Item $exePath "dist/cession-app.exe" -Force
    $exeSize = (Get-Item $exePath).Length / 1MB
    Write-Host "Executable: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "Executable not found" -ForegroundColor Red
    exit 1
}

# Copy MSI installer
$msiPath = Get-ChildItem "frontend/src-tauri/target/release/bundle/msi/*.msi" | Select-Object -First 1
if ($msiPath) {
    Copy-Item $msiPath.FullName "dist/cession-app-installer.msi" -Force
    $msiSize = (Get-Item $msiPath.FullName).Length / 1MB
    Write-Host "MSI Installer: $([math]::Round($msiSize, 2)) MB" -ForegroundColor Green
}

# Copy NSIS installer
$nsisPath = Get-ChildItem "frontend/src-tauri/target/release/bundle/nsis/*.exe" | Select-Object -First 1
if ($nsisPath) {
    Copy-Item $nsisPath.FullName "dist/cession-app-setup.exe" -Force
    $nsisSize = (Get-Item $nsisPath.FullName).Length / 1MB
    Write-Host "NSIS Installer: $([math]::Round($nsisSize, 2)) MB" -ForegroundColor Green
}

# Create simple README
$readmeText = "Cession Management App - Production Release`n`n"
$readmeText += "Files:`n"
$readmeText += "- cession-app.exe: Main application (run directly)`n"
$readmeText += "- cession-app-installer.msi: Windows MSI installer`n"
$readmeText += "- cession-app-setup.exe: NSIS installer`n`n"
$readmeText += "System Requirements:`n"
$readmeText += "- Windows 10 or later`n"
$readmeText += "- No additional software required`n`n"
$readmeText += "Build Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"

Set-Content -Path "dist/README.txt" -Value $readmeText
Write-Host "Created README.txt" -ForegroundColor Green

Write-Host ""
Write-Host "Deployment package created:" -ForegroundColor Cyan
Get-ChildItem "dist" | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length / 1MB, 2)) MB" }
    Write-Host "  $($_.Name) - $size" -ForegroundColor White
}

Write-Host ""
Write-Host "Deployment package ready!" -ForegroundColor Green