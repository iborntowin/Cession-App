#!/usr/bin/env pwsh
# Comprehensive test script to diagnose Tauri backend launching

Write-Host "=== Tauri Backend Diagnosis ===" -ForegroundColor Green
Write-Host ""

# Step 1: Verify all components
Write-Host "1. Verifying components..." -ForegroundColor Yellow

# Check Java
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "   [OK] Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Java not found" -ForegroundColor Red
    exit 1
}

# Check backend JAR in Tauri resources
$tauriJar = "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (Test-Path $tauriJar) {
    $jarSize = (Get-Item $tauriJar).Length / 1MB
    Write-Host "   [OK] Tauri JAR: $tauriJar ($([math]::Round($jarSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Tauri JAR not found: $tauriJar" -ForegroundColor Red
    exit 1
}

# Check resources JAR
$resourcesJar = "frontend/src-tauri/resources/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (Test-Path $resourcesJar) {
    Write-Host "   [OK] Resources JAR: $resourcesJar" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Resources JAR not found: $resourcesJar" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test backend JAR directly
Write-Host "2. Testing backend JAR directly..." -ForegroundColor Yellow
$testProcess = Start-Process java -ArgumentList "-jar","$tauriJar","--server.port=8083" -PassThru -WindowStyle Hidden

Write-Host "   Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/api/v1/auth/health" -Method GET -TimeoutSec 10
    Write-Host "   [SUCCESS] Backend JAR works independently (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Backend JAR failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Stop test process
Stop-Process -Id $testProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""

# Step 3: Test Tauri in development mode with detailed logging
Write-Host "3. Testing Tauri development mode..." -ForegroundColor Yellow
Write-Host "   This will start Tauri and monitor the backend startup..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop when you see the app window" -ForegroundColor Cyan
Write-Host ""

# Set environment variable for detailed Rust logging
$env:RUST_LOG = "debug"

# Start Tauri in development mode
Set-Location frontend
try {
    npm run tauri dev
} catch {
    Write-Host "   [INFO] Tauri dev stopped" -ForegroundColor Yellow
}
Set-Location ..

Write-Host ""
Write-Host "=== Diagnosis Complete ===" -ForegroundColor Green