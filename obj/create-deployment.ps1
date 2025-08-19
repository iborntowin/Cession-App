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
    Write-Host "✓ Executable: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "✗ Executable not found" -ForegroundColor Red
    exit 1
}

# Copy MSI installer
$msiPath = Get-ChildItem "frontend/src-tauri/target/release/bundle/msi/*.msi" | Select-Object -First 1
if ($msiPath) {
    Copy-Item $msiPath.FullName "dist/cession-app-installer.msi" -Force
    $msiSize = (Get-Item $msiPath.FullName).Length / 1MB
    Write-Host "✓ MSI Installer: $([math]::Round($msiSize, 2)) MB" -ForegroundColor Green
}

# Copy NSIS installer
$nsisPath = Get-ChildItem "frontend/src-tauri/target/release/bundle/nsis/*.exe" | Select-Object -First 1
if ($nsisPath) {
    Copy-Item $nsisPath.FullName "dist/cession-app-setup.exe" -Force
    $nsisSize = (Get-Item $nsisPath.FullName).Length / 1MB
    Write-Host "✓ NSIS Installer: $([math]::Round($nsisSize, 2)) MB" -ForegroundColor Green
}

# Create README
$buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$readmeContent = "# Cession Management App - Production Release`n`n"
$readmeContent += "## Installation Options`n`n"
$readmeContent += "### Option 1: Direct Run (Portable)`n"
$readmeContent += "* Run cession-app.exe directly`n"
$readmeContent += "* No installation required`n"
$readmeContent += "* App creates its own data folder`n`n"
$readmeContent += "### Option 2: MSI Installer (Recommended for Business)`n"
$readmeContent += "* Run cession-app-installer.msi`n"
$readmeContent += "* Professional Windows installation`n"
$readmeContent += "* Creates Start Menu shortcuts`n"
$readmeContent += "* Proper uninstall support`n`n"
$readmeContent += "### Option 3: NSIS Installer (Alternative)`n"
$readmeContent += "* Run cession-app-setup.exe`n"
$readmeContent += "* Lightweight installer`n"
$readmeContent += "* Quick installation process`n`n"
$readmeContent += "## System Requirements`n"
$readmeContent += "* Windows 10 or later`n"
$readmeContent += "* No additional software required (Java is bundled)`n"
$readmeContent += "* 4GB RAM recommended`n"
$readmeContent += "* 500MB free disk space`n`n"
$readmeContent += "## Data Storage`n"
$readmeContent += "Application data is stored in:`n"
$readmeContent += "%APPDATA%\com.electro.cessionapp\`n`n"
$readmeContent += "## First Run`n"
$readmeContent += "1. Launch the application`n"
$readmeContent += "2. Wait for 'System Ready' status (may take 10-15 seconds)`n"
$readmeContent += "3. The backend will start automatically`n"
$readmeContent += "4. Access the application through the desktop window`n`n"
$readmeContent += "## Support`n"
$readmeContent += "* Version: 1.0.0`n"
$readmeContent += "* Build Date: $buildDate`n"
$readmeContent += "* Platform: Windows x64`n`n"
$readmeContent += "For technical support, contact the development team.`n"

Set-Content -Path "dist/README.txt" -Value $readmeContent
Write-Host "✓ Created README.txt" -ForegroundColor Green

Write-Host ""
Write-Host "Deployment package created in 'dist' folder:" -ForegroundColor Cyan
Get-ChildItem "dist" | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length / 1MB, 2)) MB" }
    Write-Host "  📁 $($_.Name) - $size" -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 Deployment package ready!" -ForegroundColor Green
Write-Host "You can now distribute the 'dist' folder or individual installers." -ForegroundColor Yellow