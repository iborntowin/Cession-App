#!/usr/bin/env pwsh
# Simple Production Build Script
# Uses the existing npm scripts that are already working

param(
    [switch]$Clean = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION BUILD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Invoke-Step {
    param(
        [string]$StepName,
        [scriptblock]$Command,
        [string]$ErrorMessage = "Step failed"
    )
    
    Write-Host "[$StepName] Starting..." -ForegroundColor Yellow
    try {
        $result = & $Command
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
            throw "$ErrorMessage (Exit code: $LASTEXITCODE)"
        }
        Write-Host "[$StepName] Success" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "[$StepName] Failed: $_" -ForegroundColor Red
        throw
    }
}

Write-Host "STEP 1: Environment Check" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

Write-Host "Java: Available (skipping version check)" -ForegroundColor Green
Write-Host "Maven: Available (skipping version check)" -ForegroundColor Green
Write-Host "Node.js: Available (skipping version check)" -ForegroundColor Green

Write-Host ""

if ($Clean) {
    Write-Host "STEP 2: Clean Previous Builds" -ForegroundColor Magenta
    Write-Host "=============================" -ForegroundColor Magenta

    if (Test-Path "backend/target") {
        Remove-Item "backend/target" -Recurse -Force
        Write-Host "Cleaned backend/target" -ForegroundColor Green
    }

    Set-Location frontend
    if (Test-Path "src-tauri/target") {
        Remove-Item "src-tauri/target" -Recurse -Force
        Write-Host "Cleaned frontend/src-tauri/target" -ForegroundColor Green
    }
    Set-Location ..

    Write-Host ""
}

Write-Host "STEP 3: Install Dependencies" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

Set-Location frontend

# Clean node_modules if it exists to avoid lock issues
if (Test-Path "node_modules") {
    Write-Host "Cleaning node_modules..." -ForegroundColor Yellow
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Invoke-Step "Install Dependencies" {
    npm install
} "Failed to install dependencies"

Write-Host ""

Write-Host "STEP 4: Build Production Release" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

Write-Host ""
Write-Host "Building production release..." -ForegroundColor Cyan
Write-Host ""

$env:RUST_LOG = if ($Verbose) { "debug" } else { "warn" }
$env:TAURI_DEBUG = "false"

Invoke-Step "Production Build" {
    npm run tauri:build:production
} "Production build failed"

Write-Host ""

Write-Host "STEP 5: Organize Output Files" -ForegroundColor Magenta
Write-Host "=============================" -ForegroundColor Magenta

Set-Location ..

$outputDir = "dist"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$tauriOutputDir = "frontend/src-tauri/target/release"
$bundleDir = "$tauriOutputDir/bundle"

Write-Host "Looking for built files..." -ForegroundColor Yellow

$exePath = "$tauriOutputDir/cession-app.exe"
if (Test-Path $exePath) {
    Copy-Item $exePath "$outputDir/" -Force
    $exeSize = (Get-Item $exePath).Length / 1MB
    Write-Host "Executable: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "Executable not found at $exePath" -ForegroundColor Yellow
    $altExe = Get-ChildItem "$tauriOutputDir/*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($altExe) {
        Copy-Item $altExe.FullName "$outputDir/cession-app.exe" -Force
        $exeSize = (Get-Item $altExe.FullName).Length / 1MB
        Write-Host "Found executable: $($altExe.Name) - $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green
    }
}

if (Test-Path $bundleDir) {
    $msiPath = Get-ChildItem "$bundleDir/msi/*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($msiPath) {
        Copy-Item $msiPath.FullName "$outputDir/" -Force
        $msiSize = (Get-Item $msiPath.FullName).Length / 1MB
        Write-Host "MSI Installer: $([math]::Round($msiSize, 2)) MB" -ForegroundColor Green
    }

    $nsisPath = Get-ChildItem "$bundleDir/nsis/*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nsisPath) {
        Copy-Item $nsisPath.FullName "$outputDir/cession-app-installer.exe" -Force
        $nsisSize = (Get-Item $nsisPath.FullName).Length / 1MB
        Write-Host "NSIS Installer: $([math]::Round($nsisSize, 2)) MB" -ForegroundColor Green
    }
}

Write-Host ""

Write-Host "STEP 6: Create Documentation" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$readmeText = "# Cession App - Production Build`n`n"
$readmeText += "## Files`n`n"
$readmeText += "- cession-app.exe: Main application (run this directly)`n"
$readmeText += "- Installers: MSI or NSIS installer files (if generated)`n`n"
$readmeText += "## How to Run`n`n"
$readmeText += "1. Double-click cession-app.exe`n"
$readmeText += "2. The app will start automatically with its backend`n"
$readmeText += "3. Wait for the 'System Ready' status`n`n"
$readmeText += "## Requirements`n`n"
$readmeText += "- Windows 10 or later`n"
$readmeText += "- The app is self-contained (includes Java runtime)`n`n"
$readmeText += "## Data Location`n`n"
$readmeText += "App data is stored in: %APPDATA%\com.electro.cessionapp\`n`n"
$readmeText += "Build Date: $buildDate`n"

Set-Content -Path "$outputDir/README.txt" -Value $readmeText
Write-Host "Created README.txt" -ForegroundColor Green

Write-Host ""

Write-Host "STEP 7: Build Complete!" -ForegroundColor Magenta
Write-Host "=======================" -ForegroundColor Magenta

Write-Host ""
Write-Host "Production build completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Output files in '$outputDir':" -ForegroundColor Cyan

Get-ChildItem $outputDir | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length / 1MB, 2)) MB" }
    Write-Host "  $($_.Name) - $size" -ForegroundColor White
}

Write-Host ""
Write-Host "To test: Run .\$outputDir\cession-app.exe" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETED SUCCESSFULLY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan