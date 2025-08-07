# Complete Android SDK Installation and Setup Script
# This script guides you through installing Android Studio and setting up the SDK

param(
    [switch]$SkipDownload,
    [switch]$SetupOnly
)

Write-Host "🤖 Android SDK Complete Setup Guide" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Continue"

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️ This script should be run as Administrator for best results." -ForegroundColor Yellow
    Write-Host "Some environment variable changes may not persist without admin rights." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check current state
Write-Host "1️⃣ Checking current Android setup..." -ForegroundColor Blue

$androidStudioPaths = @(
    "${env:ProgramFiles}\Android\Android Studio",
    "${env:LOCALAPPDATA}\Android\Sdk",
    "${env:ProgramFiles(x86)}\Android\android-studio"
)

$androidStudioFound = $false
$sdkPath = ""

foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        Write-Host "✅ Found Android installation at: $path" -ForegroundColor Green
        if ($path -like "*Sdk*") {
            $sdkPath = $path
        }
        $androidStudioFound = $true
    }
}

# Check common SDK locations
$commonSdkPaths = @(
    "${env:LOCALAPPDATA}\Android\Sdk",
    "${env:APPDATA}\Android\Sdk",
    "${env:ProgramFiles}\Android\Sdk",
    "${env:ProgramFiles(x86)}\Android\Sdk"
)

foreach ($path in $commonSdkPaths) {
    if (Test-Path $path) {
        $sdkPath = $path
        Write-Host "✅ Found Android SDK at: $path" -ForegroundColor Green
        break
    }
}

if (-not $androidStudioFound -and -not $SkipDownload) {
    Write-Host "❌ Android Studio not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 STEP 1: Download and Install Android Studio" -ForegroundColor Yellow
    Write-Host "1. Go to: https://developer.android.com/studio" -ForegroundColor Cyan
    Write-Host "2. Download Android Studio" -ForegroundColor Cyan
    Write-Host "3. Run the installer with default settings" -ForegroundColor Cyan
    Write-Host "4. Complete the setup wizard" -ForegroundColor Cyan
    Write-Host "5. Install these SDK components when prompted:" -ForegroundColor Cyan
    Write-Host "   - Android SDK Platform-Tools" -ForegroundColor White
    Write-Host "   - Android SDK Build-Tools (latest version)" -ForegroundColor White
    Write-Host "   - Android SDK Platform (API 33 or 34)" -ForegroundColor White
    Write-Host "   - Android NDK (optional)" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "Have you installed Android Studio? (y/n)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "Please install Android Studio first, then run this script again." -ForegroundColor Yellow
        exit 0
    }
    
    # Re-check after installation
    foreach ($path in $commonSdkPaths) {
        if (Test-Path $path) {
            $sdkPath = $path
            Write-Host "✅ Found Android SDK at: $path" -ForegroundColor Green
            break
        }
    }
}

# Step 2: Determine SDK path
Write-Host "`n2️⃣ Determining Android SDK path..." -ForegroundColor Blue

if (-not $sdkPath) {
    Write-Host "🔍 SDK not found in common locations. Let's find it..." -ForegroundColor Yellow
    
    # Try to find through Android Studio
    $studioPath = "${env:ProgramFiles}\Android\Android Studio\bin\studio64.exe"
    if (-not (Test-Path $studioPath)) {
        $studioPath = "${env:LOCALAPPDATA}\Programs\Android\Android Studio\bin\studio64.exe"
    }
    
    if (Test-Path $studioPath) {
        Write-Host "✅ Android Studio executable found" -ForegroundColor Green
        $sdkPath = "${env:LOCALAPPDATA}\Android\Sdk"  # Default location
    } else {
        Write-Host "❓ Please enter your Android SDK path manually:" -ForegroundColor Yellow
        Write-Host "Common locations:" -ForegroundColor Cyan
        Write-Host "  - $env:LOCALAPPDATA\Android\Sdk" -ForegroundColor White
        Write-Host "  - $env:APPDATA\Android\Sdk" -ForegroundColor White
        Write-Host ""
        
        do {
            $sdkPath = Read-Host "Enter Android SDK path"
            if (-not (Test-Path $sdkPath)) {
                Write-Host "❌ Path not found: $sdkPath" -ForegroundColor Red
            }
        } while (-not (Test-Path $sdkPath))
    }
}

Write-Host "✅ Using Android SDK path: $sdkPath" -ForegroundColor Green

# Step 3: Verify SDK components
Write-Host "`n3️⃣ Verifying SDK components..." -ForegroundColor Blue

$requiredComponents = @{
    "Platform-Tools" = "$sdkPath\platform-tools\adb.exe"
    "Build-Tools" = "$sdkPath\build-tools"
    "Platforms" = "$sdkPath\platforms"
}

$missingComponents = @()

foreach ($component in $requiredComponents.GetEnumerator()) {
    if (Test-Path $component.Value) {
        Write-Host "✅ $($component.Key) found" -ForegroundColor Green
        
        if ($component.Key -eq "Build-Tools") {
            $buildToolVersions = Get-ChildItem $component.Value | Sort-Object Name -Descending
            if ($buildToolVersions) {
                Write-Host "   Latest version: $($buildToolVersions[0].Name)" -ForegroundColor Cyan
            }
        }
        
        if ($component.Key -eq "Platforms") {
            $platforms = Get-ChildItem $component.Value | Where-Object { $_.Name -match "android-\d+" }
            if ($platforms) {
                $latestPlatform = $platforms | Sort-Object Name -Descending | Select-Object -First 1
                Write-Host "   Latest platform: $($latestPlatform.Name)" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "❌ $($component.Key) missing" -ForegroundColor Red
        $missingComponents += $component.Key
    }
}

if ($missingComponents.Count -gt 0) {
    Write-Host "`n⚠️ Missing SDK components detected!" -ForegroundColor Yellow
    Write-Host "To install missing components:" -ForegroundColor Cyan
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Go to Tools > SDK Manager" -ForegroundColor White
    Write-Host "3. Install these components:" -ForegroundColor White
    foreach ($component in $missingComponents) {
        Write-Host "   - $component" -ForegroundColor Red
    }
    Write-Host ""
    
    $continue = Read-Host "Have you installed the missing components? (y/n)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "Please install the missing components first." -ForegroundColor Yellow
        exit 0
    }
}

# Step 4: Set environment variables
Write-Host "`n4️⃣ Setting environment variables..." -ForegroundColor Blue

$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath

# Find NDK if available
$ndkPath = "$sdkPath\ndk"
if (Test-Path $ndkPath) {
    $ndkVersions = Get-ChildItem $ndkPath | Sort-Object Name -Descending
    if ($ndkVersions) {
        $latestNdk = $ndkVersions[0].FullName
        $env:ANDROID_NDK_HOME = $latestNdk
        $env:NDK_HOME = $latestNdk
        Write-Host "✅ NDK found: $($ndkVersions[0].Name)" -ForegroundColor Green
    }
}

# Update PATH
$pathsToAdd = @(
    "$sdkPath\platform-tools",
    "$sdkPath\tools",
    "$sdkPath\tools\bin"
)

# Check for cmdline-tools
$cmdlineTools = "$sdkPath\cmdline-tools"
if (Test-Path $cmdlineTools) {
    $cmdlineVersions = Get-ChildItem $cmdlineTools | Sort-Object Name -Descending
    if ($cmdlineVersions) {
        $pathsToAdd += "$($cmdlineVersions[0].FullName)\bin"
    }
}

$currentPath = $env:PATH
foreach ($pathToAdd in $pathsToAdd) {
    if ($currentPath -notlike "*$pathToAdd*") {
        $env:PATH = "$pathToAdd;$currentPath"
    }
}

Write-Host "✅ Environment variables set for current session" -ForegroundColor Green

# Step 5: Make changes permanent
if ($isAdmin) {
    Write-Host "`n5️⃣ Making environment changes permanent..." -ForegroundColor Blue
    
    try {
        [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "Machine")
        [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "Machine")
        
        if ($env:ANDROID_NDK_HOME) {
            [Environment]::SetEnvironmentVariable("ANDROID_NDK_HOME", $env:ANDROID_NDK_HOME, "Machine")
            [Environment]::SetEnvironmentVariable("NDK_HOME", $env:ANDROID_NDK_HOME, "Machine")
        }
        
        # Update system PATH
        $systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        $newPath = $systemPath
        
        foreach ($pathToAdd in $pathsToAdd) {
            if ($systemPath -notlike "*$pathToAdd*") {
                $newPath += ";$pathToAdd"
            }
        }
        
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        
        Write-Host "✅ Environment variables set permanently" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Failed to set permanent environment variables: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n5️⃣ Setting user environment variables..." -ForegroundColor Blue
    
    try {
        [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
        [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "User")
        
        if ($env:ANDROID_NDK_HOME) {
            [Environment]::SetEnvironmentVariable("ANDROID_NDK_HOME", $env:ANDROID_NDK_HOME, "User")
            [Environment]::SetEnvironmentVariable("NDK_HOME", $env:ANDROID_NDK_HOME, "User")
        }
        
        Write-Host "✅ User environment variables set" -ForegroundColor Green
        Write-Host "⚠️ For system-wide PATH changes, run as Administrator" -ForegroundColor Yellow
    } catch {
        Write-Host "⚠️ Failed to set user environment variables: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Step 6: Test the setup
Write-Host "`n6️⃣ Testing the setup..." -ForegroundColor Blue

try {
    $adbVersion = & "$sdkPath\platform-tools\adb.exe" version 2>&1
    if ($adbVersion -match "Android Debug Bridge") {
        Write-Host "✅ ADB is working correctly" -ForegroundColor Green
    } else {
        Write-Host "⚠️ ADB test failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ADB test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Final summary
Write-Host "`n🎉 Android SDK Setup Complete!" -ForegroundColor Green
Write-Host "=" * 50
Write-Host "Environment Variables Set:" -ForegroundColor Yellow
Write-Host "  ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Cyan
Write-Host "  ANDROID_SDK_ROOT: $env:ANDROID_SDK_ROOT" -ForegroundColor Cyan
if ($env:ANDROID_NDK_HOME) {
    Write-Host "  ANDROID_NDK_HOME: $env:ANDROID_NDK_HOME" -ForegroundColor Cyan
}

Write-Host "`n⚠️ IMPORTANT: Restart your terminal/IDE for changes to take effect!" -ForegroundColor Yellow

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Restart your terminal" -ForegroundColor Cyan
Write-Host "2. Run: .\validate-android-setup.ps1" -ForegroundColor Cyan
Write-Host "3. Run: .\final-android-build.ps1" -ForegroundColor Cyan

Write-Host "`n✨ You're ready to build Android APKs!" -ForegroundColor Green