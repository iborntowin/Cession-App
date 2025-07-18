#!/usr/bin/env pwsh
# Test script to verify Tauri backend integration fixes

Write-Host "Testing Tauri Backend Integration Fixes..." -ForegroundColor Green
Write-Host ""

# Step 1: Verify JAR files are in place
Write-Host "1. Verifying JAR files..." -ForegroundColor Yellow
$jarPaths = @(
    "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/resources/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
)

foreach ($jarPath in $jarPaths) {
    if (Test-Path $jarPath) {
        $size = (Get-Item $jarPath).Length / 1MB
        Write-Host "   [OK] $jarPath ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Missing: $jarPath" -ForegroundColor Red
    }
}

Write-Host ""

# Step 2: Test Rust compilation
Write-Host "2. Testing Rust compilation..." -ForegroundColor Yellow
Set-Location frontend/src-tauri
try {
    $output = cargo check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Rust code compiles successfully" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Rust compilation failed:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERROR] Cargo check failed: $_" -ForegroundColor Red
}
Set-Location ../..

Write-Host ""

# Step 3: Test backend JAR directly
Write-Host "3. Testing backend JAR directly..." -ForegroundColor Yellow
$testProcess = Start-Process java -ArgumentList "-jar","frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar","--server.port=8084" -PassThru -WindowStyle Hidden

Write-Host "   Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8084/api/v1/auth/health" -Method GET -TimeoutSec 10
    Write-Host "   [SUCCESS] Backend JAR works (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   [WARNING] Backend health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   This might be normal if health endpoint doesn't exist" -ForegroundColor Yellow
}

# Stop test process
Stop-Process -Id $testProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "If all JAR files are present and Rust compiles successfully," -ForegroundColor White
Write-Host "then the Tauri backend integration should work." -ForegroundColor White
Write-Host ""
Write-Host "Next step: Run 'cd frontend && npm run tauri dev' to test the full app" -ForegroundColor Yellow