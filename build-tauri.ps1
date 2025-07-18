#!/usr/bin/env pwsh
# Tauri Build Script for Cession Management App
# This script builds the backend, frontend, and creates the Tauri executable

Write-Host "Building Cession Management App with Tauri..." -ForegroundColor Green

# Check if Java is installed
Write-Host "Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "[OK] Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Java not found. Please install Java 17 or higher." -ForegroundColor Red
    exit 1
}

# Check if Rust is installed
Write-Host "Checking Rust installation..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "[OK] Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Rust not found. Please install Rust from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Step 1: Build the backend
Write-Host "Building Spring Boot backend..." -ForegroundColor Yellow
Set-Location backend
try {
    mvn clean package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        throw "Maven build failed"
    }
    Write-Host "[OK] Backend built successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend build failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Step 2: Copy backend JAR to Tauri resources
Write-Host "Managing backend JAR for Tauri build..." -ForegroundColor Yellow
try {
    & .\copy-backend-jar.ps1 -Verbose -Force
    if ($LASTEXITCODE -ne 0) {
        throw "JAR management script failed"
    }
} catch {
    Write-Host "[ERROR] Failed to manage backend JAR: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Frontend dependency installation failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Step 4: Build the frontend
Write-Host "Building Svelte frontend..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed"
    }
    Write-Host "[OK] Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Frontend build failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Step 5: Build Tauri app
Write-Host "Building Tauri executable..." -ForegroundColor Yellow
try {
    npm run tauri build
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri build failed"
    }
    Write-Host "[OK] Tauri app built successfully!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Tauri build failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Step 6: Show build results
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Build artifacts can be found in:" -ForegroundColor Cyan
Write-Host "  - Windows: frontend/src-tauri/target/release/bundle/msi/" -ForegroundColor White
Write-Host "  - Executable: frontend/src-tauri/target/release/cession-app-frontend.exe" -ForegroundColor White
Write-Host ""
Write-Host "To run the development version:" -ForegroundColor Cyan
Write-Host "  cd frontend && npm run tauri dev" -ForegroundColor White