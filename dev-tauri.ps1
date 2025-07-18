#!/usr/bin/env pwsh
# Complete Tauri Development Script
# This script builds the backend, copies JARs, and starts Tauri dev

param(
    [switch]$Clean = $false,
    [switch]$SkipBuild = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAURI DEVELOPMENT ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to run command with error handling
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
        Write-Host "[$StepName] ✓ Success" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "[$StepName] ✗ Failed: $_" -ForegroundColor Red
        throw
    }
}

# Step 1: Environment Check
Write-Host "STEP 1: Environment Check" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

# Check Java
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Host "✓ Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found. Please install Java 17+" -ForegroundColor Red
    exit 1
}

# Check Maven
try {
    $mavenVersion = mvn -version 2>&1 | Select-String "Apache Maven" | Select-Object -First 1
    Write-Host "✓ Maven: $mavenVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Maven not found. Please install Apache Maven" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""

if (-not $SkipBuild) {
    # Step 2: Build Backend
    Write-Host "STEP 2: Build Spring Boot Backend" -ForegroundColor Magenta
    Write-Host "==================================" -ForegroundColor Magenta

    Set-Location backend

    if ($Clean) {
        Invoke-Step "Clean Backend" {
            mvn clean
        } "Backend clean failed"
    }

    Invoke-Step "Package Backend" {
        mvn clean package -DskipTests -Dspring.profiles.active=desktop
    } "Backend build failed"

    # Verify JAR exists and get size
    $jarPath = "target/cession-app-backend-0.0.1-SNAPSHOT.jar"
    if (-not (Test-Path $jarPath)) {
        Write-Host "✗ Backend JAR not found at $jarPath" -ForegroundColor Red
        exit 1
    }

    $jarSize = (Get-Item $jarPath).Length / 1MB
    Write-Host "✓ Backend JAR: $([math]::Round($jarSize, 2)) MB" -ForegroundColor Green

    Set-Location ..
    Write-Host ""
}

# Step 3: Setup Tauri Directories and Copy JARs
Write-Host "STEP 3: Setup Tauri Environment" -ForegroundColor Magenta
Write-Host "===============================" -ForegroundColor Magenta

# Define all necessary directories
$directories = @(
    "frontend/src-tauri/backend",
    "frontend/src-tauri/target/debug/backend",
    "frontend/src-tauri/target/release/backend"
)

# Create directories if they don't exist
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Gray
    }
}

# Copy JAR files to all locations
$sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $sourceJar)) {
    Write-Host "✗ Source JAR not found: $sourceJar" -ForegroundColor Red
    Write-Host "  Run the script without -SkipBuild to build the backend first" -ForegroundColor Yellow
    exit 1
}

$destinations = @(
    "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/backend/app.jar",
    "frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/debug/backend/app.jar",
    "frontend/src-tauri/target/release/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/release/backend/app.jar"
)

Write-Host "Copying JAR files..." -ForegroundColor Yellow
foreach ($dest in $destinations) {
    Copy-Item $sourceJar $dest -Force
    Write-Host "  ✓ $dest" -ForegroundColor Green
}

Write-Host ""

# Step 4: Verify JAR Integrity
Write-Host "STEP 4: Verify JAR Integrity" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$testJar = "frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"

# Quick JAR validation
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $testJar).Path)
    $entryCount = $zip.Entries.Count
    $hasBootLoader = $zip.Entries | Where-Object { $_.FullName -like "*JarLauncher*" }
    $zip.Dispose()
    
    Write-Host "✓ JAR is valid ZIP with $entryCount entries" -ForegroundColor Green
    
    if ($hasBootLoader) {
        Write-Host "✓ Spring Boot loader found" -ForegroundColor Green
    } else {
        Write-Host "✗ Spring Boot loader missing - JAR may be corrupted" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ JAR validation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Kill any existing Java processes
Write-Host "STEP 5: Clean Up Existing Processes" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta

try {
    $javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
    if ($javaProcesses) {
        Write-Host "Stopping existing Java processes..." -ForegroundColor Yellow
        $javaProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "✓ Java processes stopped" -ForegroundColor Green
    } else {
        Write-Host "✓ No existing Java processes found" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Could not check/stop Java processes: $_" -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Update Tauri Configuration
Write-Host "STEP 6: Update Tauri Configuration" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta

$configPath = "frontend/src-tauri/tauri.conf.json"
if (Test-Path $configPath) {
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        
        # Ensure bundle resources are correctly configured
        $config.bundle.resources = @(
            "backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
            "backend/app.jar"
        )
        
        # Update CSP for localhost connections
        $config.app.security.csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:8082 http://localhost:8083 http://localhost:8084 http://localhost:8085;"
        
        # Save updated config
        $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
        Write-Host "✓ Tauri configuration updated" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not update Tauri config: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Tauri config not found at $configPath" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Install Frontend Dependencies
Write-Host "STEP 7: Install Frontend Dependencies" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

Set-Location frontend

# Check if node_modules exists and is recent
$nodeModulesExists = Test-Path "node_modules"
$packageLockExists = Test-Path "package-lock.json"

if (-not $nodeModulesExists -or -not $packageLockExists) {
    Invoke-Step "Install Dependencies" {
        npm install
    } "Failed to install frontend dependencies"
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# Step 8: Start Tauri Development Server
Write-Host "STEP 8: Start Tauri Development Server" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta

Write-Host ""
Write-Host "🚀 Starting Tauri development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected behavior:" -ForegroundColor White
Write-Host "  1. Backend will start automatically (may take 10-15 seconds)" -ForegroundColor Gray
Write-Host "  2. Frontend will open in a desktop window" -ForegroundColor Gray
Write-Host "  3. Health status should show 'System Ready'" -ForegroundColor Gray
Write-Host "  4. Database status should show 'UP'" -ForegroundColor Gray
Write-Host ""
Write-Host "If you see 'JarLauncher' errors, press Ctrl+C and run this script again." -ForegroundColor Yellow
Write-Host ""

# Set environment variables for development
$env:RUST_LOG = if ($Verbose) { "debug" } else { "info" }
$env:TAURI_DEBUG = if ($Verbose) { "true" } else { "false" }


try {
    # Start Tauri dev server
    npm run tauri dev
} catch {
    Write-Host ""
    Write-Host "✗ Tauri development server failed to start" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Check that all Java processes are stopped" -ForegroundColor Gray
    Write-Host "  2. Verify JAR file integrity" -ForegroundColor Gray
    Write-Host "  3. Run with -Verbose flag for detailed logs" -ForegroundColor Gray
    Write-Host "  4. Check Tauri logs in the console output above" -ForegroundColor Gray
    exit 1
}

# Cleanup on exit
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAURI DEVELOPMENT SESSION ENDED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan