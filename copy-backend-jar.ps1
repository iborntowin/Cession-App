#!/usr/bin/env pwsh
# Backend JAR Management Script for Tauri
# This script handles copying and verifying the Spring Boot JAR for Tauri builds

param(
    [switch]$Verbose,
    [switch]$Force
)

Write-Host "Managing backend JAR for Tauri..." -ForegroundColor Yellow

# Define paths
$backendJar = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
$tauriBackendDir = "frontend/src-tauri/backend"
$tauriResourcesDir = "frontend/src-tauri/resources/backend"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $tauriBackendDir | Out-Null
New-Item -ItemType Directory -Force -Path $tauriResourcesDir | Out-Null

# Verify source JAR exists
if (-not (Test-Path $backendJar)) {
    Write-Host "[ERROR] Backend JAR not found at $backendJar" -ForegroundColor Red
    Write-Host "Please build the backend first using: mvn clean package" -ForegroundColor Red
    exit 1
}

# Get source JAR info
$sourceJar = Get-Item $backendJar
$jarSize = $sourceJar.Length

if ($Verbose) {
    Write-Host "[INFO] Source JAR: $backendJar" -ForegroundColor Cyan
    Write-Host "[INFO] Size: $([math]::Round($jarSize/1MB, 2)) MB" -ForegroundColor Cyan
}

# Validate JAR size
if ($jarSize -lt 1MB) {
    Write-Host "[WARNING] Backend JAR seems unusually small" -ForegroundColor Yellow
    if (-not $Force) {
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            exit 1
        }
    }
}

# Define target files
$targetFiles = @(
    "$tauriBackendDir/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "$tauriBackendDir/app.jar",
    "$tauriResourcesDir/cession-app-backend-0.0.1-SNAPSHOT.jar",
    "$tauriResourcesDir/app.jar"
)

# Copy JAR files
Write-Host "Copying backend JAR to Tauri locations..." -ForegroundColor Yellow

try {
    foreach ($targetPath in $targetFiles) {
        Copy-Item $backendJar $targetPath -Force
        if ($Verbose) {
            Write-Host "  Copied to: $targetPath" -ForegroundColor Gray
        }
    }
    
    Write-Host "[OK] Backend JAR copied to all required locations" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to copy backend JAR: $_" -ForegroundColor Red
    exit 1
}

# Verify copied files
Write-Host "Verifying copied files..." -ForegroundColor Yellow

foreach ($targetPath in $targetFiles) {
    if (-not (Test-Path $targetPath)) {
        Write-Host "[ERROR] Failed to copy JAR to $targetPath" -ForegroundColor Red
        exit 1
    }
    
    $copiedFile = Get-Item $targetPath
    if ($copiedFile.Length -ne $jarSize) {
        Write-Host "[ERROR] JAR copy verification failed for $targetPath" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] All JAR files verified successfully" -ForegroundColor Green

if ($Verbose) {
    Write-Host "JAR files copied to:" -ForegroundColor Cyan
    foreach ($targetPath in $targetFiles) {
        Write-Host "  - $targetPath" -ForegroundColor Gray
    }
}