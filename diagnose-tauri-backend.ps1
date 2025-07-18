#!/usr/bin/env pwsh
# Comprehensive Tauri Backend Diagnostic Script

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAURI BACKEND DIAGNOSTIC TOOL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check file and report details
function Test-FileDetails {
    param([string]$FilePath, [string]$Description)
    
    Write-Host "Checking $Description..." -ForegroundColor Yellow
    if (Test-Path $FilePath) {
        $file = Get-Item $FilePath
        $size = [math]::Round($file.Length / 1MB, 2)
        Write-Host "  ✓ Found: $FilePath ($size MB)" -ForegroundColor Green
        
        # For JAR files, check if they're valid
        if ($FilePath.EndsWith(".jar")) {
            try {
                $zipTest = [System.IO.Compression.ZipFile]::OpenRead($FilePath)
                $entryCount = $zipTest.Entries.Count
                $zipTest.Dispose()
                Write-Host "    ✓ JAR is valid ZIP with $entryCount entries" -ForegroundColor Green
                
                # Check for Spring Boot loader
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                $zip = [System.IO.Compression.ZipFile]::OpenRead($FilePath)
                $hasBootLoader = $zip.Entries | Where-Object { $_.FullName -like "*JarLauncher*" }
                $hasMainClass = $zip.Entries | Where-Object { $_.FullName -eq "META-INF/MANIFEST.MF" }
                $zip.Dispose()
                
                if ($hasBootLoader) {
                    Write-Host "    ✓ Spring Boot loader found" -ForegroundColor Green
                } else {
                    Write-Host "    ✗ Spring Boot loader NOT found" -ForegroundColor Red
                }
                
                if ($hasMainClass) {
                    Write-Host "    ✓ MANIFEST.MF found" -ForegroundColor Green
                } else {
                    Write-Host "    ✗ MANIFEST.MF NOT found" -ForegroundColor Red
                }
                
            } catch {
                Write-Host "    ✗ JAR appears to be corrupted: $_" -ForegroundColor Red
            }
        }
        return $true
    } else {
        Write-Host "  ✗ Not found: $FilePath" -ForegroundColor Red
        return $false
    }
}

# Function to test Java execution
function Test-JavaExecution {
    param([string]$JarPath)
    
    Write-Host "Testing Java execution of JAR..." -ForegroundColor Yellow
    try {
        $output = & java -jar $JarPath --help 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ JAR executes successfully" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ JAR execution returned non-zero exit code" -ForegroundColor Yellow
            Write-Host "    Output: $($output -join ' ')" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ✗ JAR execution failed: $_" -ForegroundColor Red
    }
}

# Step 1: Environment Check
Write-Host "STEP 1: Environment Check" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

# Java version
try {
    $javaVersion = & java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Host "✓ Java: $javaVersion" -ForegroundColor Green
    
    # Check Java version number
    $versionMatch = $javaVersion -match '"(\d+)\.(\d+)\.(\d+)'
    if ($versionMatch) {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -ge 17) {
            Write-Host "  ✓ Java version is compatible (17+)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Java version may be too old (need 17+)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "✗ Java not found or not accessible" -ForegroundColor Red
}

# Maven version
try {
    $mavenVersion = & mvn -version 2>&1 | Select-String "Apache Maven" | Select-Object -First 1
    Write-Host "✓ Maven: $mavenVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Maven not found" -ForegroundColor Red
}

Write-Host ""

# Step 2: File Structure Check
Write-Host "STEP 2: File Structure Check" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$filesToCheck = @(
    @{ Path = "backend/pom.xml"; Description = "Backend POM file" },
    @{ Path = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"; Description = "Backend JAR (main)" },
    @{ Path = "frontend/src-tauri/tauri.conf.json"; Description = "Tauri configuration" },
    @{ Path = "frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"; Description = "Tauri debug JAR" },
    @{ Path = "frontend/src-tauri/target/debug/backend/app.jar"; Description = "Tauri debug fallback JAR" },
    @{ Path = "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"; Description = "Tauri resource JAR" }
)

foreach ($file in $filesToCheck) {
    Test-FileDetails -FilePath $file.Path -Description $file.Description
}

Write-Host ""

# Step 3: POM.xml Analysis
Write-Host "STEP 3: POM.xml Analysis" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

if (Test-Path "backend/pom.xml") {
    $pomContent = Get-Content "backend/pom.xml" -Raw
    
    # Check for common issues
    if ($pomContent -match '<n>') {
        Write-Host "✗ Found typo in POM.xml: <n> instead of <name>" -ForegroundColor Red
    } else {
        Write-Host "✓ No obvious typos in POM.xml" -ForegroundColor Green
    }
    
    if ($pomContent -match 'spring-boot-maven-plugin') {
        Write-Host "✓ Spring Boot Maven plugin found" -ForegroundColo