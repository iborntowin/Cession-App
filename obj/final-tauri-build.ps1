#!/usr/bin/env pwsh
# Final Tauri Build Script – Windows-ready, complete workflow

param(
    [switch]$SkipClean = $false,
    [switch]$Verbose   = $false
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
    } catch {
        Write-Host "[$StepName] Failed: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FINAL TAURI BUILD & DEV SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 1: Clean Up Existing Processes" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta
$javaProcs = Get-Process -Name java -ErrorAction SilentlyContinue
if ($javaProcs) {
    $javaProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Java processes stopped" -ForegroundColor Green
} else {
    Write-Host "No Java processes found" -ForegroundColor Green
}
Write-Host ""

if (-not $SkipClean) {
    Write-Host "STEP 2: Clean Backend" -ForegroundColor Magenta
    Write-Host "=====================" -ForegroundColor Magenta
    Set-Location backend
    Invoke-Step "Maven Clean" { mvn clean --batch-mode }
    if (Test-Path target) { Remove-Item target -Recurse -Force -ErrorAction SilentlyContinue }
    Set-Location ..
    Write-Host ""
}

Write-Host "STEP 3: Build Spring Boot Backend" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Set-Location backend
Invoke-Step "Maven Package" { mvn clean package -DskipTests -Dspring.profiles.active=desktop --batch-mode }
$jarPath = "target/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "JAR NOT FOUND: $jarPath" -ForegroundColor Red
    exit 1
}
$jarSize = [math]::Round((Get-Item $jarPath).Length / 1MB, 2)
Write-Host "Backend JAR built: $jarSize MB" -ForegroundColor Green
Set-Location ..
Write-Host ""

Write-Host "STEP 4: Copy JAR to Tauri Directories" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta
$sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
$dirs = "frontend/src-tauri/backend", "frontend/src-tauri/target/debug/backend", "frontend/src-tauri/target/release/backend"
foreach ($d in $dirs) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null } }
$destinations = "frontend/src-tauri/backend/app.jar", "frontend/src-tauri/target/debug/backend/app.jar", "frontend/src-tauri/target/release/backend/app.jar"
$ok = 0
foreach ($dest in $destinations) {
    try { Copy-Item $sourceJar $dest -Force; ++$ok } catch { Write-Host "Copy failed: $dest" -ForegroundColor Red }
}
Write-Host "Copied to $ok/$($destinations.Count) locations" -ForegroundColor Green
Write-Host ""

Write-Host "STEP 5: Install Frontend Dependencies" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta
Set-Location frontend
if (-not (Test-Path node_modules) -or -not (Test-Path package-lock.json)) {
    Invoke-Step "npm install" { npm install --silent }
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}
Write-Host ""

Write-Host "STEP 6: Update Tauri Configuration" -ForegroundColor Magenta
Write-Host "==================================" -ForegroundColor Magenta
$configPath = "src-tauri/tauri.conf.json"
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
    Write-Host "tauri.conf.json not found – skipping" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "STEP 7: Start Tauri Development Server" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Starting Tauri dev server..." -ForegroundColor Cyan
$env:RUST_LOG   = if ($Verbose) { "debug" } else { "info" }
$env:TAURI_DEBUG = if ($Verbose) { "true" } else { "false" }
try {
    npm run tauri dev
} catch {
    Write-Host "Dev server failed to start" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAURI DEV SESSION ENDED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan