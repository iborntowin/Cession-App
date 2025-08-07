# Quick Fix for Android SDK Components
# This script attempts to install missing SDK components using sdkmanager

Write-Host "🔧 Quick Android SDK Fix" -ForegroundColor Green
Write-Host "=" * 30

# Check if Android Studio is installed
$androidStudioPaths = @(
    "${env:LOCALAPPDATA}\Android\Sdk",
    "${env:APPDATA}\Android\Sdk",
    "${env:ProgramFiles}\Android\Sdk"
)

$sdkPath = ""
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        $sdkPath = $path
        break
    }
}

if (-not $sdkPath) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host "Please run: .\install-android-sdk.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found Android SDK at: $sdkPath" -ForegroundColor Green

# Set environment variables for this session
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath

# Check for sdkmanager
$sdkManager = "$sdkPath\cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sdkManager)) {
    # Try alternative location
    $cmdlineTools = Get-ChildItem "$sdkPath\cmdline-tools" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if ($cmdlineTools) {
        $sdkManager = "$($cmdlineTools.FullName)\bin\sdkmanager.bat"
    }
}

if (Test-Path $sdkManager) {
    Write-Host "✅ Found SDK Manager" -ForegroundColor Green
    
    Write-Host "📦 Installing required SDK components..." -ForegroundColor Blue
    
    # Install required components
    $components = @(
        "platform-tools",
        "build-tools;34.0.0",
        "platforms;android-34",
        "platforms;android-33"
    )
    
    foreach ($component in $components) {
        Write-Host "Installing $component..." -ForegroundColor Yellow
        try {
            & $sdkManager $component --sdk_root=$sdkPath
            Write-Host "✅ $component installed" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Failed to install $component" -ForegroundColor Yellow
        }
    }
    
} else {
    Write-Host "❌ SDK Manager not found!" -ForegroundColor Red
    Write-Host "Manual installation required:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor Cyan
    Write-Host "2. Go to Tools > SDK Manager" -ForegroundColor Cyan
    Write-Host "3. Install:" -ForegroundColor Cyan
    Write-Host "   - Android SDK Platform-Tools" -ForegroundColor White
    Write-Host "   - Android SDK Build-Tools (34.0.0)" -ForegroundColor White
    Write-Host "   - Android 14 (API 34)" -ForegroundColor White
    Write-Host "   - Android 13 (API 33)" -ForegroundColor White
}

# Update PATH for current session
$pathsToAdd = @(
    "$sdkPath\platform-tools",
    "$sdkPath\tools",
    "$sdkPath\tools\bin"
)

foreach ($pathToAdd in $pathsToAdd) {
    if ($env:PATH -notlike "*$pathToAdd*") {
        $env:PATH = "$pathToAdd;$env:PATH"
    }
}

Write-Host "`n🔍 Verifying installation..." -ForegroundColor Blue

# Test ADB
if (Test-Path "$sdkPath\platform-tools\adb.exe") {
    Write-Host "✅ ADB found" -ForegroundColor Green
} else {
    Write-Host "❌ ADB still missing" -ForegroundColor Red
}

# Test Build Tools
if (Test-Path "$sdkPath\build-tools") {
    $buildTools = Get-ChildItem "$sdkPath\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
    if ($buildTools) {
        Write-Host "✅ Build-tools found: $($buildTools.Name)" -ForegroundColor Green
    } else {
        Write-Host "❌ Build-tools directory empty" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Build-tools still missing" -ForegroundColor Red
}

Write-Host "`n🎯 Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your terminal" -ForegroundColor Cyan
Write-Host "2. Run: .\validate-android-setup.ps1" -ForegroundColor Cyan
Write-Host "3. If issues persist, run: .\install-android-sdk.ps1" -ForegroundColor Cyan