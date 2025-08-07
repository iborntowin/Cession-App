# Android Environment Setup Script
# Run this script as Administrator

# Set Android SDK path (adjust path if different)
$ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$ANDROID_NDK_HOME = "$ANDROID_HOME\ndk\26.1.10909125"  # Adjust version as needed

# Set environment variables for current session
$env:ANDROID_HOME = $ANDROID_HOME
$env:ANDROID_NDK_HOME = $ANDROID_NDK_HOME
$env:NDK_HOME = $ANDROID_NDK_HOME

# Add to system PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$androidPaths = @(
    "$ANDROID_HOME\platform-tools",
    "$ANDROID_HOME\tools",
    "$ANDROID_HOME\tools\bin",
    "$ANDROID_HOME\cmdline-tools\latest\bin"
)

foreach ($path in $androidPaths) {
    if ($currentPath -notlike "*$path*") {
        $currentPath += ";$path"
    }
}

# Set permanent environment variables (requires admin)
try {
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $ANDROID_HOME, "Machine")
    [Environment]::SetEnvironmentVariable("ANDROID_NDK_HOME", $ANDROID_NDK_HOME, "Machine")
    [Environment]::SetEnvironmentVariable("NDK_HOME", $ANDROID_NDK_HOME, "Machine")
    [Environment]::SetEnvironmentVariable("Path", $currentPath, "Machine")
    
    Write-Host "✅ Environment variables set successfully!" -ForegroundColor Green
    Write-Host "ANDROID_HOME: $ANDROID_HOME" -ForegroundColor Cyan
    Write-Host "ANDROID_NDK_HOME: $ANDROID_NDK_HOME" -ForegroundColor Cyan
    
    Write-Host "`n⚠️  Please restart your terminal/IDE for changes to take effect!" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to set environment variables. Please run as Administrator." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Verify installation
Write-Host "`nVerifying Android SDK installation..." -ForegroundColor Blue
if (Test-Path "$ANDROID_HOME\platform-tools\adb.exe") {
    Write-Host "✅ ADB found" -ForegroundColor Green
} else {
    Write-Host "❌ ADB not found. Please install Android SDK Platform-Tools" -ForegroundColor Red
}

if (Test-Path "$ANDROID_HOME\build-tools") {
    $buildTools = Get-ChildItem "$ANDROID_HOME\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
    Write-Host "✅ Build-tools found: $($buildTools.Name)" -ForegroundColor Green
} else {
    Write-Host "❌ Build-tools not found. Please install Android SDK Build-Tools" -ForegroundColor Red
}