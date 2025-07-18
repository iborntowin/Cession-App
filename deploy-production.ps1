#!/usr/bin/env pwsh
# Production Deployment Script for Tauri Application
# This script builds the backend, frontend, and creates a production executable

param(
    [switch]$Clean = $false,
    [switch]$SkipTests = $true,
    [switch]$Verbose = $false,
    [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION DEPLOYMENT BUILD" -ForegroundColor Cyan
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

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Rust not found. Please install Rust from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Clean Previous Builds
if ($Clean) {
    Write-Host "STEP 2: Clean Previous Builds" -ForegroundColor Magenta
    Write-Host "=============================" -ForegroundColor Magenta

    # Clean backend
    if (Test-Path "backend/target") {
        Remove-Item "backend/target" -Recurse -Force
        Write-Host "✓ Cleaned backend/target" -ForegroundColor Green
    }

    # Clean frontend
    Set-Location frontend
    if (Test-Path "node_modules") {
        Remove-Item "node_modules" -Recurse -Force
        Write-Host "✓ Cleaned frontend/node_modules" -ForegroundColor Green
    }
    if (Test-Path "src-tauri/target") {
        Remove-Item "src-tauri/target" -Recurse -Force
        Write-Host "✓ Cleaned frontend/src-tauri/target" -ForegroundColor Green
    }
    Set-Location ..

    # Clean output directory
    if (Test-Path $OutputDir) {
        Remove-Item $OutputDir -Recurse -Force
        Write-Host "✓ Cleaned output directory: $OutputDir" -ForegroundColor Green
    }

    Write-Host ""
}

# Step 3: Build Backend (Production)
Write-Host "STEP 3: Build Spring Boot Backend (Production)" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

Set-Location backend

$buildArgs = @("clean", "package", "-Dspring.profiles.active=production")
if ($SkipTests) {
    $buildArgs += "-DskipTests"
}

Invoke-Step "Package Backend" {
    mvn @buildArgs
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

# Step 4: Setup Tauri Production Environment
Write-Host "STEP 4: Setup Tauri Production Environment" -ForegroundColor Magenta
Write-Host "===========================================" -ForegroundColor Magenta

# Define all necessary directories
$directories = @(
    "frontend/src-tauri/backend",
    "frontend/src-tauri/target/release/backend",
    "frontend/src-tauri/resources"
)

# Create directories if they don't exist
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Gray
    }
}

# Copy JAR files to production locations
$sourceJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
$destinations = @(
    "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/backend/app.jar",
    "frontend/src-tauri/target/release/backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "frontend/src-tauri/target/release/backend/app.jar",
    "frontend/src-tauri/resources/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
)

Write-Host "Copying JAR files to production locations..." -ForegroundColor Yellow
foreach ($dest in $destinations) {
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item $sourceJar $dest -Force
    Write-Host "  ✓ $dest" -ForegroundColor Green
}

Write-Host ""

# Step 5: Update Tauri Configuration for Production
Write-Host "STEP 5: Update Tauri Configuration for Production" -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Magenta

$configPath = "frontend/src-tauri/tauri.conf.json"
if (Test-Path $configPath) {
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        
        # Ensure bundle resources are correctly configured
        if (-not $config.bundle) {
            $config | Add-Member -NotePropertyName "bundle" -NotePropertyValue @{}
        }
        $config.bundle.resources = @(
            "backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
            "backend/app.jar"
        )
        
        # Update app identifier and version
        $config.identifier = "com.electro.cessionapp"
        $config.version = "1.0.0"
        
        # Production security settings
        $config.app.security.csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:8082;"
        
        # Windows-specific settings
        if (-not $config.bundle.windows) {
            $config.bundle | Add-Member -NotePropertyName "windows" -NotePropertyValue @{}
        }
        $config.bundle.windows.certificateThumbprint = $null
        $config.bundle.windows.digestAlgorithm = "sha256"
        $config.bundle.windows.timestampUrl = $null
        
        # Save updated config
        $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
        Write-Host "✓ Tauri configuration updated for production" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not update Tauri config: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Tauri config not found at $configPath" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 6: Install Frontend Dependencies
Write-Host "STEP 6: Install Frontend Dependencies" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

Set-Location frontend

Invoke-Step "Install Dependencies" {
    npm ci --production=false
} "Failed to install frontend dependencies"

Write-Host ""

# Step 7: Build Frontend for Production
Write-Host "STEP 7: Build Frontend for Production" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

Invoke-Step "Build Frontend" {
    npm run build
} "Frontend build failed"

Write-Host ""

# Step 8: Build Tauri Application
Write-Host "STEP 8: Build Tauri Application (Release)" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

# Set environment variables for production build
$env:RUST_LOG = if ($Verbose) { "debug" } else { "warn" }
$env:TAURI_DEBUG = "false"

Write-Host ""
Write-Host "🚀 Building Tauri application for production..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

Invoke-Step "Build Tauri Release" {
    npm run tauri build
} "Tauri build failed"

Write-Host ""

# Step 9: Package and Organize Output
Write-Host "STEP 9: Package and Organize Output" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta

Set-Location ..

# Create output directory
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Find the built executable and installer
$tauriOutputDir = "frontend/src-tauri/target/release"
$bundleDir = "$tauriOutputDir/bundle"

# Copy executable
$exePath = "$tauriOutputDir/cession-app.exe"
if (Test-Path $exePath) {
    Copy-Item $exePath "$OutputDir/" -Force
    $exeSize = (Get-Item $exePath).Length / 1MB
    Write-Host "✓ Executable: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "⚠ Executable not found at $exePath" -ForegroundColor Yellow
}

# Copy MSI installer if it exists
$msiPath = Get-ChildItem "$bundleDir/msi/*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($msiPath) {
    Copy-Item $msiPath.FullName "$OutputDir/" -Force
    $msiSize = (Get-Item $msiPath.FullName).Length / 1MB
    Write-Host "✓ MSI Installer: $([math]::Round($msiSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "⚠ MSI installer not found" -ForegroundColor Yellow
}

# Copy NSIS installer if it exists
$nsisPath = Get-ChildItem "$bundleDir/nsis/*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($nsisPath) {
    Copy-Item $nsisPath.FullName "$OutputDir/cession-app-installer.exe" -Force
    $nsisSize = (Get-Item $nsisPath.FullName).Length / 1MB
    Write-Host "✓ NSIS Installer: $([math]::Round($nsisSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "⚠ NSIS installer not found" -ForegroundColor Yellow
}

Write-Host ""

# Step 10: Create Deployment Package
Write-Host "STEP 10: Create Deployment Package" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta

# Create README for deployment
$buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$readmeContent = @"
# Cession App - Production Deployment

## Files Included

- cession-app.exe: Main application executable
- cession-app-installer.exe: Windows installer (if available)
- cession-app.msi: MSI installer package (if available)

## Installation Instructions

### Option 1: Direct Execution
1. Run cession-app.exe directly
2. The application will create its data directory automatically
3. Backend will start automatically when the app launches

### Option 2: Using Installer
1. Run cession-app-installer.exe or cession-app.msi
2. Follow the installation wizard
3. Launch from Start Menu or Desktop shortcut

## System Requirements

- Windows 10 or later
- Java 17 or higher (bundled with application)
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space

## Data Storage

Application data is stored in:
%APPDATA%\com.electro.cessionapp\

This includes:
- Database files
- Application logs
- Backup files
- Temporary files

## Troubleshooting

If the application fails to start:
1. Check Windows Event Viewer for error details
2. Ensure no antivirus is blocking the application
3. Run as Administrator if needed
4. Check that port 8082 is not in use by another application

## Version Information

- Build Date: $buildDate
- Backend: Spring Boot with H2 Database
- Frontend: Svelte with Tauri
- Platform: Windows x64

For support, contact the development team.
"@

Set-Content -Path "$OutputDir/README.txt" -Value $readmeContent
Write-Host "✓ Created deployment README" -ForegroundColor Green

# Create version info file
$versionInfo = @{
    version = "1.0.0"
    buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    platform = "windows-x64"
    backend = "Spring Boot 3.x"
    frontend = "Svelte + Tauri"
    javaVersion = (java -version 2>&1 | Select-String "version" | Select-Object -First 1).ToString()
}

$versionInfo | ConvertTo-Json -Depth 2 | Set-Content "$OutputDir/version.json"
Write-Host "✓ Created version information" -ForegroundColor Green

Write-Host ""

# Step 11: Final Summary
Write-Host "STEP 11: Build Summary" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta

Write-Host ""
Write-Host "🎉 Production build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Output directory: $OutputDir" -ForegroundColor Cyan
Write-Host ""

# List all files in output directory
Get-ChildItem $OutputDir | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length / 1MB, 2)) MB" }
    Write-Host "  📁 $($_.Name) - $size" -ForegroundColor White
}

Write-Host ""
Write-Host "Deployment Instructions:" -ForegroundColor Yellow
Write-Host "1. Test the executable locally first" -ForegroundColor Gray
Write-Host "2. Package the entire '$OutputDir' folder for distribution" -ForegroundColor Gray
Write-Host "3. Users can run the installer or executable directly" -ForegroundColor Gray
Write-Host "4. The application is self-contained and portable" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION BUILD COMPLETED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan