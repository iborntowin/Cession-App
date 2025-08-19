# Android APK Testing Script
# This script helps test the generated APK

param(
    [string]$ApkPath,
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Launch,
    [switch]$Logs
)

$packageName = "com.nassimmaaoui.cessionapp"

Write-Host "📱 Android APK Testing Utility" -ForegroundColor Green
Write-Host "=" * 40

# Check ADB
if (-not $env:ANDROID_HOME -or -not (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
    Write-Host "❌ ADB not found. Please set up Android SDK first." -ForegroundColor Red
    exit 1
}

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

# Check connected devices
Write-Host "🔍 Checking connected devices..." -ForegroundColor Blue
$devices = & $adb devices 2>&1
$deviceLines = $devices | Where-Object { $_ -match "\tdevice$" }

if (-not $deviceLines) {
    Write-Host "❌ No Android devices connected." -ForegroundColor Red
    Write-Host "Please connect a device or start an emulator." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Connected devices:" -ForegroundColor Green
foreach ($device in $deviceLines) {
    Write-Host "   $device" -ForegroundColor Cyan
}

# Find APK if not specified
if (-not $ApkPath) {
    Write-Host "`n🔍 Looking for APK files..." -ForegroundColor Blue
    $apkFiles = Get-ChildItem -Path "frontend/src-tauri/gen" -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue
    
    if ($apkFiles) {
        $ApkPath = $apkFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
        Write-Host "✅ Found APK: $ApkPath" -ForegroundColor Green
    } else {
        Write-Host "❌ No APK files found. Please build first with .\build-android.ps1" -ForegroundColor Red
        exit 1
    }
}

# Verify APK exists
if (-not (Test-Path $ApkPath)) {
    Write-Host "❌ APK file not found: $ApkPath" -ForegroundColor Red
    exit 1
}

# Get APK info
Write-Host "`n📊 APK Information:" -ForegroundColor Blue
$apkInfo = Get-Item $ApkPath
Write-Host "   File: $($apkInfo.Name)" -ForegroundColor Cyan
Write-Host "   Size: $([math]::Round($apkInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "   Modified: $($apkInfo.LastWriteTime)" -ForegroundColor Cyan

# Uninstall if requested
if ($Uninstall) {
    Write-Host "`n🗑️ Uninstalling existing app..." -ForegroundColor Yellow
    try {
        & $adb uninstall $packageName 2>&1 | Out-Null
        Write-Host "✅ App uninstalled successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ App was not installed or uninstall failed" -ForegroundColor Yellow
    }
}

# Install APK
if ($Install -or (-not $Uninstall -and -not $Launch -and -not $Logs)) {
    Write-Host "`n📲 Installing APK..." -ForegroundColor Blue
    try {
        $installResult = & $adb install -r $ApkPath 2>&1
        
        if ($installResult -match "Success") {
            Write-Host "✅ APK installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Installation failed:" -ForegroundColor Red
            Write-Host $installResult -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Launch app
if ($Launch) {
    Write-Host "`n🚀 Launching app..." -ForegroundColor Blue
    try {
        & $adb shell am start -n "$packageName/.MainActivity" 2>&1 | Out-Null
        Write-Host "✅ App launched!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to launch app: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Show logs
if ($Logs) {
    Write-Host "`n📋 Showing app logs (Ctrl+C to stop)..." -ForegroundColor Blue
    Write-Host "Filtering for package: $packageName" -ForegroundColor Cyan
    try {
        & $adb logcat | Select-String $packageName
    } catch {
        Write-Host "❌ Failed to show logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Show usage if no specific action
if (-not $Install -and -not $Uninstall -and -not $Launch -and -not $Logs) {
    Write-Host "`n✅ APK ready for testing!" -ForegroundColor Green
    Write-Host "`nUsage examples:" -ForegroundColor Yellow
    Write-Host "  .\test-android-apk.ps1 -Install    # Install APK" -ForegroundColor Cyan
    Write-Host "  .\test-android-apk.ps1 -Launch     # Launch app" -ForegroundColor Cyan
    Write-Host "  .\test-android-apk.ps1 -Logs       # Show app logs" -ForegroundColor Cyan
    Write-Host "  .\test-android-apk.ps1 -Uninstall  # Uninstall app" -ForegroundColor Cyan
}