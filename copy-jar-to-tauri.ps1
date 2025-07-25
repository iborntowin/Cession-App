#!/usr/bin/env pwsh
# Dedicated script for copying backend JAR to Tauri directories
# This script only handles JAR copying - no building, no other tasks

param(
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COPYING JAR TO TAURI DIRECTORIES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define source JAR path
$sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"

# Check if source JAR exists
if (-not (Test-Path $sourceJar)) {
    Write-Host "✗ Source JAR not found: $sourceJar" -ForegroundColor Red
    Write-Host "  Please build the backend first:" -ForegroundColor Yellow
    Write-Host "    cd backend" -ForegroundColor Gray
    Write-Host "    mvn clean package" -ForegroundColor Gray
    exit 1
}

# Get JAR size for info
$jarSize = (Get-Item $sourceJar).Length / 1MB
Write-Host "✓ Source JAR found: $([math]::Round($jarSize, 2)) MB" -ForegroundColor Green

# Create the necessary directories
Write-Host ""
Write-Host "Creating Tauri directories..." -ForegroundColor Yellow
$directories = @(
    "frontend/src-tauri/backend",
    "frontend/src-tauri/target/debug/backend",
    "frontend/src-tauri/target/release/backend"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created: $dir" -ForegroundColor Green
    } else {
        if ($Verbose) {
            Write-Host "  ✓ Exists: $dir" -ForegroundColor Gray
        }
    }
}

# Copy the JAR to all required locations
Write-Host ""
Write-Host "Copying JAR files..." -ForegroundColor Yellow
$destinations = @(
    "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/backend/app.jar",
    "frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/debug/backend/app.jar",
    "frontend/src-tauri/target/release/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/release/backend/app.jar"
)

$copyCount = 0
foreach ($dest in $destinations) {
    try {
        Copy-Item $sourceJar $dest -Force
        Write-Host "  ✓ Copied to: $dest" -ForegroundColor Green
        $copyCount++
    } catch {
        Write-Host "  ✗ Failed to copy to: $dest" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COPY OPERATION COMPLETED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($copyCount -eq $destinations.Count) {
    Write-Host "✅ SUCCESS: All $copyCount JAR files copied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "JAR is now available in all Tauri locations:" -ForegroundColor White
    Write-Host "  • frontend/src-tauri/backend/ (resource location)" -ForegroundColor Gray
    Write-Host "  • frontend/src-tauri/target/debug/backend/ (debug builds)" -ForegroundColor Gray
    Write-Host "  • frontend/src-tauri/target/release/backend/ (release builds)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now run:" -ForegroundColor Cyan
    Write-Host "  npm run tauri dev" -ForegroundColor White
    Write-Host "  npm run tauri build" -ForegroundColor White
} else {
    Write-Host "⚠️  WARNING: Only $copyCount out of $($destinations.Count) copies succeeded" -ForegroundColor Yellow
    Write-Host "Some JAR files may not be available for Tauri" -ForegroundColor Yellow
}

Write-Host ""