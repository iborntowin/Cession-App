# Android Development Script for Tauri
# This script runs the app in development mode on Android

Write-Host "🚀 Starting Android Development Mode..." -ForegroundColor Green

# Set working directory
Set-Location "frontend"

try {
    # Check environment
    Write-Host "🔍 Checking environment..." -ForegroundColor Blue
    
    if (-not $env:ANDROID_HOME) {
        Write-Host "❌ ANDROID_HOME not set. Please run setup-android-env.ps1 first!" -ForegroundColor Red
        exit 1
    }
    
    # Check for connected devices
    Write-Host "📱 Checking for connected Android devices..." -ForegroundColor Blue
    $devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices
    Write-Host $devices
    
    if ($devices -match "device$") {
        Write-Host "✅ Android device detected!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No Android devices detected. Please connect a device or start an emulator." -ForegroundColor Yellow
        Write-Host "To start an emulator: emulator -avd <avd_name>" -ForegroundColor Cyan
    }

    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
        npm install
    }

    # Initialize Android if needed
    if (-not (Test-Path "src-tauri/gen/android")) {
        Write-Host "🤖 Initializing Android target..." -ForegroundColor Blue
        tauri android init
    }

    # Start development server
    Write-Host "🔥 Starting Android development mode..." -ForegroundColor Blue
    Write-Host "This will:" -ForegroundColor Yellow
    Write-Host "  1. Start the frontend dev server" -ForegroundColor Yellow
    Write-Host "  2. Build and install the app on your device" -ForegroundColor Yellow
    Write-Host "  3. Enable hot reload for development" -ForegroundColor Yellow
    Write-Host ""
    
    tauri android dev

} catch {
    Write-Host "❌ Development mode failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ".."
}