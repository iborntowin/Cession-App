#!/usr/bin/env pwsh
# Validation Script for Tauri Setup

Write-Host "Validating Tauri Setup for Cession Management App..." -ForegroundColor Green
Write-Host ""

$allGood = $true

# Check Java
Write-Host "1. Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "   [OK] Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Java not found. Please install Java 17 or higher." -ForegroundColor Red
    $allGood = $false
}

# Check Rust
Write-Host "2. Checking Rust installation..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "   [OK] Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Rust not found. Please install from https://rustup.rs/" -ForegroundColor Red
    $allGood = $false
}

# Check Node.js
Write-Host "3. Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   [OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    $allGood = $false
}

# Check backend JAR
Write-Host "4. Checking backend JAR..." -ForegroundColor Yellow
$backendJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (Test-Path $backendJar) {
    Write-Host "   [OK] Backend JAR found: $backendJar" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Backend JAR not found. Run: cd backend; mvn clean package" -ForegroundColor Red
    $allGood = $false
}

# Check Tauri backend resources
Write-Host "5. Checking Tauri backend resources..." -ForegroundColor Yellow
$tauriJar1 = "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
$tauriJar2 = "frontend/src-tauri/resources/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"

if (Test-Path $tauriJar1) {
    Write-Host "   [OK] Tauri backend JAR found" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Tauri backend JAR missing" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path $tauriJar2) {
    Write-Host "   [OK] Tauri resources JAR found" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Tauri resources JAR missing" -ForegroundColor Red
    $allGood = $false
}

# Check frontend dependencies
Write-Host "6. Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend/node_modules") {
    Write-Host "   [OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] Frontend dependencies not installed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "SUCCESS: All checks passed! Your Tauri setup is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  - Development mode: .\dev-tauri.ps1" -ForegroundColor White
    Write-Host "  - Build executable: .\build-tauri.ps1" -ForegroundColor White
} else {
    Write-Host "ERROR: Some issues found. Please fix the errors above." -ForegroundColor Red
}

Write-Host ""