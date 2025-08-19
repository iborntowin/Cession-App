#!/usr/bin/env pwsh
# Complete Tauri Build Workflow Script
# 1. Builds Spring Boot backend
# 2. Copies JAR to Tauri directories
# 3. Builds Tauri application

param(
    [switch]$Verbose = $false,
    [switch]$SkipBackendBuild = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [string]$StepName,
        [scriptblock]$Command,
        [string]$ErrorMessage = "Step failed"
    )
    Write-Host "[$StepName] Starting..." -ForegroundColor Yellow
    try {
        & $Command
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "$ErrorMessage (Exit code: $LASTEXITCODE)"
        }
        Write-Host "[$StepName] Success" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[$StepName] Failed: $_" -ForegroundColor Red
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAURI COMPLETE BUILD WORKFLOW" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build Spring Boot Backend
$backendBuilt = $false
if (-not $SkipBackendBuild) {
    Write-Host "STEP 1: Build Spring Boot Backend" -ForegroundColor Magenta
    Write-Host "=================================" -ForegroundColor Magenta
    
    $backendBuilt = Invoke-Step "Maven Build" {
        Set-Location backend
        mvn clean package -DskipTests -Dspring.profiles.active=desktop --batch-mode
        Set-Location ..
    } "Backend build failed"
    
    if (-not $backendBuilt) {
        exit 1
    }
    
    $jarPath = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
    if (-not (Test-Path $jarPath)) {
        Write-Host "JAR NOT FOUND: $jarPath" -ForegroundColor Red
        exit 1
    }
    $jarSize = [math]::Round((Get-Item $jarPath).Length / 1MB, 2)
    Write-Host "Backend JAR built: $jarSize MB" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping backend build as requested" -ForegroundColor Yellow
    Write-Host ""
}

# 2. Copy JAR to Tauri directories
Write-Host "STEP 2: Copy JAR to Tauri Directories" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

$sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $sourceJar)) {
    Write-Host "Source JAR not found: $sourceJar" -ForegroundColor Red
    Write-Host "Please build the backend first or remove -SkipBackendBuild flag" -ForegroundColor Yellow
    exit 1
}

# Create required directories
$directories = @(
    "frontend/src-tauri/backend",
    "frontend/src-tauri/target/debug/backend",
    "frontend/src-tauri/target/release/backend",
    "frontend/src-tauri/resources/backend"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        if ($Verbose) {
            Write-Host "Created directory: $dir" -ForegroundColor Gray
        }
    }
}

# Define copy targets
$destinations = @(
    "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/backend/app.jar",
    "frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/debug/backend/app.jar",
    "frontend/src-tauri/target/release/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/release/backend/app.jar",
    "frontend/src-tauri/resources/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/resources/backend/app.jar"
)

# Perform copy operations
$copySuccess = $true
foreach ($dest in $destinations) {
    try {
        Copy-Item $sourceJar $dest -Force
        if ($Verbose) {
            Write-Host "Copied to: $dest" -ForegroundColor Gray
        }
    } catch {
        Write-Host "Failed to copy to: $dest" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        $copySuccess = $false
    }
}

if (-not $copySuccess) {
    Write-Host "Some JAR copies failed. Check errors above." -ForegroundColor Red
    exit 1
}

Write-Host "JAR copied to $($destinations.Count) locations" -ForegroundColor Green
Write-Host ""

# 3. Build Tauri application
Write-Host "STEP 3: Build Tauri Application" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta

# Update Tauri configuration
Write-Host "Updating Tauri configuration..." -ForegroundColor Yellow
$configPath = "frontend/src-tauri/tauri.conf.json"
if (Test-Path $configPath) {
    try {
        $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
        $cfg.bundle.resources = @("backend/app.jar")
        $cfg.app.security.csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:8082 http://localhost:8083 http://localhost:8084 http://localhost:8085;"
        $cfg | ConvertTo-Json -Depth 10 | Set-Content $configPath
        Write-Host "tauri.conf.json updated" -ForegroundColor Green
    } catch {
        Write-Host "Could not update config: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "tauri.conf.json not found – skipping update" -ForegroundColor Yellow
}
Write-Host ""

# Run Tauri build
Set-Location frontend/src-tauri
Write-Host "Building Tauri application from: $(Get-Location)" -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

$buildSuccess = Invoke-Step "Tauri Build" {
    npm run tauri build
} "Tauri build failed"

Set-Location ../..

if ($buildSuccess) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Tauri application built in: frontend/src-tauri/target/release" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    exit 1
}