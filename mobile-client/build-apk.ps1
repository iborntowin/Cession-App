# Quick APK build script for Cession Manager Mobile App
# This script quickly builds an APK for testing with updated icons from the desktop app

param(
    [Parameter()]
    [ValidateSet("development", "preview", "production")]
    [string]$Environment = "preview"
)

Write-Host "Quick APK Build for Cession Manager Mobile" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "app.json")) {
    Write-Host "app.json not found. Please run this script from the mobile-client directory." -ForegroundColor Red
    exit 1
}

# Update icons from desktop app
Write-Host "Updating icons from desktop app..." -ForegroundColor Blue
$desktopIconsPath = "../frontend/src-tauri/icons"
if (Test-Path $desktopIconsPath) {
    Copy-Item "$desktopIconsPath/icon.png" "assets/icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/adaptive-icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/splash-icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/favicon.png" -Force
    Write-Host "Icons updated!" -ForegroundColor Green
} else {
    Write-Host "Desktop icons not found, using existing icons" -ForegroundColor Yellow
}

# Clear cache
Write-Host "Clearing cache..." -ForegroundColor Blue
if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue }
if (Test-Path ".metro-cache") { Remove-Item -Recurse -Force ".metro-cache" -ErrorAction SilentlyContinue }

# Set environment
switch ($Environment) {
    "development" { $env:NODE_ENV = "development" }
    "preview" { $env:NODE_ENV = "staging" }
    "production" { $env:NODE_ENV = "production" }
}

# Build APK
Write-Host "Building APK..." -ForegroundColor Blue
Write-Host "This will take a few minutes..." -ForegroundColor Yellow

try {
    switch ($Environment) {
        "development" { npm run build:dev:android }
        "preview" { npm run build:preview:android }
        "production" { npm run build:prod:android }
    }
    
    Write-Host ""
    Write-Host "APK build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Check your EAS dashboard: https://expo.dev" -ForegroundColor White
    Write-Host "  2. Download the APK when ready" -ForegroundColor White
    Write-Host "  3. Install on your Android device for testing" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  Make sure you're logged into EAS: eas login" -ForegroundColor White
    Write-Host "  Check your internet connection" -ForegroundColor White
    Write-Host "  Try clearing node_modules: rm -rf node_modules && npm install" -ForegroundColor White
    exit 1
}