#!/usr/bin/env pwsh
# Fix Backend Build Script for Tauri Integration

param(
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIXING BACKEND BUILD FOR TAURI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Fix POM.xml if needed
Write-Host "STEP 1: Fix POM.xml" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta

$pomPath = "backend/pom.xml"
$pomContent = Get-Content $pomPath -Raw

# Fix the typo in name tag
if ($pomContent -match '<n>cession-app-backend</n>') {
    Write-Host "Fixing typo in pom.xml..." -ForegroundColor Yellow
    $pomContent = $pomContent -replace '<n>cession-app-backend</n>', '<name>cession-app-backend</name>'
    $pomContent | Set-Content $pomPath -NoNewline
    Write-Host "✓ POM.xml fixed" -ForegroundColor Green
} else {
    Write-Host "✓ POM.xml looks correct" -ForegroundColor Green
}

# Step 2: Clean and rebuild backend
Write-Host ""
Write-Host "STEP 2: Clean and Rebuild Backend" -ForegroundColor Magenta
Write-Host "==================================" -ForegroundColor Magenta

Set-Location backend

if ($Clean) {
    Write-Host "Cleaning backend..." -ForegroundColor Yellow
    mvn clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Backend clean failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Backend cleaned" -ForegroundColor Green
}

# Build with explicit Spring Boot plugin configuration
Write-Host "Building backend JAR..." -ForegroundColor Yellow
mvn clean package -DskipTests -Dspring.profiles.active=desktop
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend build completed" -ForegroundColor Green

# Verify the JAR is properly built
$jarPath = "target/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "✗ Backend JAR not found at $jarPath" -ForegroundColor Red
    exit 1
}

$jarSize = (Get-Item $jarPath).Length / 1MB
Write-Host "✓ Backend JAR created: $([math]::Round($jarSize, 2)) MB" -ForegroundColor Green

Set-Location ..

# Step 3: Copy to Tauri directories
Write-Host ""
Write-Host "STEP 3: Copy JAR to Tauri Directories" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

# Ensure Tauri backend directories exist
$tauriDebugDir = "frontend/src-tauri/target/debug/backend"
$tauriReleaseDir = "frontend/src-tauri/target/release/backend"
$tauriResourceDir = "frontend/src-tauri/backend"

foreach ($dir in @($tauriDebugDir, $tauriReleaseDir, $tauriResourceDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Gray
    }
}

# Copy the JAR file to all necessary locations
$sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
$destinations = @(
    "$tauriDebugDir/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "$tauriDebugDir/app.jar",
    "$tauriReleaseDir/cession-app-backend-0.0.1-SNAPSHOT.jar", 
    "$tauriReleaseDir/app.jar",
    "$tauriResourceDir/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "$tauriResourceDir/app.jar"
)

foreach ($dest in $destinations) {
    Copy-Item $sourceJar $dest -Force
    Write-Host "✓ Copied to: $dest" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKEND BUILD FIX COMPLETED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Run: npm run tauri dev" -ForegroundColor Gray
Write-Host "  2. Check that backend starts without the JarLauncher error" -ForegroundColor Gray
Write-Host "  3. If issues persist, check Java version compatibility" -ForegroundColor Gray