#!/usr/bin/env pwsh
# Quick Development Script - Minimal setup for daily development

param(
    [switch]$Rebuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Quick Tauri Development Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Kill existing Java processes
try {
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✓ Cleaned up existing Java processes" -ForegroundColor Green
} catch {
    Write-Host "✓ No Java processes to clean up" -ForegroundColor Green
}

if ($Rebuild) {
    Write-Host "🔨 Rebuilding backend..." -ForegroundColor Yellow
    Set-Location backend
    mvn clean package -DskipTests -q
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Backend build failed" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
    
    # Copy JARs
    $sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
    $destinations = @(
        "frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
        "frontend/src-tauri/target/debug/backend/app.jar"
    )
    
    foreach ($dest in $destinations) {
        $destDir = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $sourceJar $dest -Force
    }
    Write-Host "✓ Backend rebuilt and copied" -ForegroundColor Green
}

Write-Host "🎯 Starting Tauri dev server..." -ForegroundColor Cyan
Write-Host ""

Set-Location frontend
npm run tauri dev