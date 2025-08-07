# Android Setup Validation Script
# This script validates your Android development environment

Write-Host "🔍 Validating Android Development Environment..." -ForegroundColor Green
Write-Host "=" * 50

$allGood = $true

# Check Java
Write-Host "`n☕ Checking Java..." -ForegroundColor Blue
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green
    
    if ($env:JAVA_HOME) {
        Write-Host "✅ JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
    } else {
        Write-Host "⚠️ JAVA_HOME not set" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Java not found or not in PATH" -ForegroundColor Red
    $allGood = $false
}

# Check Android SDK
Write-Host "`n🤖 Checking Android SDK..." -ForegroundColor Blue
if ($env:ANDROID_HOME) {
    Write-Host "✅ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
    
    # Check ADB
    $adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        Write-Host "✅ ADB found" -ForegroundColor Green
        try {
            $adbVersion = & $adbPath version 2>&1 | Select-String "Android Debug Bridge"
            Write-Host "   Version: $adbVersion" -ForegroundColor Cyan
        } catch {
            Write-Host "⚠️ ADB found but not working properly" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ ADB not found at $adbPath" -ForegroundColor Red
        $allGood = $false
    }
    
    # Check Build Tools
    $buildToolsPath = "$env:ANDROID_HOME\build-tools"
    if (Test-Path $buildToolsPath) {
        $buildTools = Get-ChildItem $buildToolsPath | Sort-Object Name -Descending | Select-Object -First 1
        if ($buildTools) {
            Write-Host "✅ Build-tools found: $($buildTools.Name)" -ForegroundColor Green
        } else {
            Write-Host "❌ No build-tools versions found" -ForegroundColor Red
            $allGood = $false
        }
    } else {
        Write-Host "❌ Build-tools directory not found" -ForegroundColor Red
        $allGood = $false
    }
    
    # Check Platforms
    $platformsPath = "$env:ANDROID_HOME\platforms"
    if (Test-Path $platformsPath) {
        $platforms = Get-ChildItem $platformsPath | Where-Object { $_.Name -match "android-\d+" }
        if ($platforms) {
            $latestPlatform = $platforms | Sort-Object Name -Descending | Select-Object -First 1
            Write-Host "✅ Android platforms found. Latest: $($latestPlatform.Name)" -ForegroundColor Green
        } else {
            Write-Host "❌ No Android platforms found" -ForegroundColor Red
            $allGood = $false
        }
    } else {
        Write-Host "❌ Platforms directory not found" -ForegroundColor Red
        $allGood = $false
    }
    
    # Check NDK
    $ndkPath = "$env:ANDROID_HOME\ndk"
    if (Test-Path $ndkPath) {
        $ndkVersions = Get-ChildItem $ndkPath
        if ($ndkVersions) {
            $latestNdk = $ndkVersions | Sort-Object Name -Descending | Select-Object -First 1
            Write-Host "✅ Android NDK found: $($latestNdk.Name)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ NDK directory exists but no versions found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Android NDK not found (may be needed for some features)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "❌ ANDROID_HOME not set" -ForegroundColor Red
    $allGood = $false
}

# Check Rust and Cargo
Write-Host "`n🦀 Checking Rust..." -ForegroundColor Blue
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust found: $rustVersion" -ForegroundColor Green
    
    $cargoVersion = cargo --version
    Write-Host "✅ Cargo found: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust/Cargo not found" -ForegroundColor Red
    $allGood = $false
}

# Check Tauri CLI
Write-Host "`n⚡ Checking Tauri CLI..." -ForegroundColor Blue
Set-Location "frontend"
try {
    $tauriVersion = tauri --version
    Write-Host "✅ Tauri CLI found: $tauriVersion" -ForegroundColor Green
    
    # Check if Android commands are available
    $androidHelp = tauri android --help 2>&1
    if ($androidHelp -match "Android commands") {
        Write-Host "✅ Tauri Android support available" -ForegroundColor Green
    } else {
        Write-Host "❌ Tauri Android support not available" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "❌ Tauri CLI not found" -ForegroundColor Red
    $allGood = $false
} finally {
    Set-Location ".."
}

# Check connected devices
Write-Host "`n📱 Checking connected devices..." -ForegroundColor Blue
if ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
    try {
        $devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices 2>&1
        $deviceLines = $devices | Where-Object { $_ -match "\tdevice$" }
        
        if ($deviceLines) {
            Write-Host "✅ Connected devices found:" -ForegroundColor Green
            foreach ($device in $deviceLines) {
                Write-Host "   $device" -ForegroundColor Cyan
            }
        } else {
            Write-Host "⚠️ No devices connected. Connect a device or start an emulator." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to check devices" -ForegroundColor Red
    }
}

# Final summary
Write-Host "`n" + "=" * 50
if ($allGood) {
    Write-Host "🎉 All checks passed! You're ready to build Android APKs!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Run: .\final-android-build.ps1 -Debug    # For debug APK" -ForegroundColor Cyan
    Write-Host "2. Run: .\final-android-build.ps1           # For release APK" -ForegroundColor Cyan
    Write-Host "3. Run: .\dev-android.ps1                   # For development mode" -ForegroundColor Cyan
} else {
    Write-Host "❌ Some issues found. Please fix them before building." -ForegroundColor Red
    Write-Host "`nQuick fixes to try:" -ForegroundColor Yellow
    Write-Host "1. Run: .\fix-android-sdk.ps1               # Quick component fix" -ForegroundColor Cyan
    Write-Host "2. Run: .\install-android-sdk.ps1           # Complete setup guide" -ForegroundColor Cyan
    Write-Host "3. Restart terminal after any changes" -ForegroundColor Cyan
    Write-Host "`nManual installation:" -ForegroundColor Yellow
    Write-Host "1. Download Android Studio: https://developer.android.com/studio" -ForegroundColor Cyan
    Write-Host "2. Install with default settings" -ForegroundColor Cyan
    Write-Host "3. Open SDK Manager and install Platform-Tools & Build-Tools" -ForegroundColor Cyan
}