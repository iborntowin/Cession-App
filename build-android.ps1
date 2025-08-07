# Android Build Script for Tauri
# This script builds the Android APK

param(
    [switch]$Debug,
    [switch]$Release,
    [switch]$Clean
)

Write-Host "🚀 Starting Android Build Process..." -ForegroundColor Green

# Set working directory
Set-Location "frontend"

try {
    # Clean if requested
    if ($Clean) {
        Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
        if (Test-Path "src-tauri/gen/android") {
            Remove-Item -Recurse -Force "src-tauri/gen/android"
        }
        if (Test-Path "src-tauri/target") {
            Remove-Item -Recurse -Force "src-tauri/target"
        }
    }

    # Check environment
    Write-Host "🔍 Checking environment..." -ForegroundColor Blue
    
    if (-not $env:ANDROID_HOME) {
        Write-Host "❌ ANDROID_HOME not set. Please run setup-android-env.ps1 first!" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
        Write-Host "❌ Android SDK not found. Please install Android Studio and SDK." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Android SDK found at: $env:ANDROID_HOME" -ForegroundColor Green

    # Install dependencies
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install frontend dependencies"
    }

    # Build frontend
    Write-Host "🏗️ Building frontend..." -ForegroundColor Blue
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build frontend"
    }

    # Initialize Android if needed
    Write-Host "🤖 Initializing Android target..." -ForegroundColor Blue
    tauri android init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Android init had issues, but continuing..." -ForegroundColor Yellow
    }

    # Build Android APK
    if ($Debug) {
        Write-Host "🔨 Building Android APK (Debug)..." -ForegroundColor Blue
        tauri android dev --no-dev-server
    } elseif ($Release) {
        Write-Host "🔨 Building Android APK (Release)..." -ForegroundColor Blue
        tauri android build --apk
    } else {
        Write-Host "🔨 Building Android APK (Debug - default)..." -ForegroundColor Blue
        tauri android build --apk --debug
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Android APK built successfully!" -ForegroundColor Green
        
        # Find and display APK location
        $apkPath = Get-ChildItem -Path "src-tauri/gen/android" -Filter "*.apk" -Recurse | Select-Object -First 1
        if ($apkPath) {
            Write-Host "📱 APK Location: $($apkPath.FullName)" -ForegroundColor Cyan
            Write-Host "📊 APK Size: $([math]::Round($apkPath.Length / 1MB, 2)) MB" -ForegroundColor Cyan
        }
        
        Write-Host "`n🎉 Build completed successfully!" -ForegroundColor Green
        Write-Host "To install on device: adb install path/to/your.apk" -ForegroundColor Yellow
    } else {
        throw "Android build failed"
    }

} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ".."
}