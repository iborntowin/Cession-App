# Simple deployment script for Cession Manager Mobile App

param(
    [string]$Environment = "preview"
)

Write-Host "Deploying Cession Manager Mobile App" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Check if we're in the right directory
if (!(Test-Path "app.json")) {
    Write-Host "Error: app.json not found. Run this from mobile-client directory." -ForegroundColor Red
    exit 1
}

# Update icons from desktop app
Write-Host "Updating icons..." -ForegroundColor Blue
$desktopIconsPath = "../frontend/src-tauri/icons"
if (Test-Path "$desktopIconsPath/icon.png") {
    Copy-Item "$desktopIconsPath/icon.png" "assets/icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/adaptive-icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/splash-icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/favicon.png" -Force
    Write-Host "Icons updated successfully" -ForegroundColor Green
} else {
    Write-Host "Warning: Desktop icons not found, using existing icons" -ForegroundColor Yellow
}

# Clear cache
Write-Host "Clearing cache..." -ForegroundColor Blue
if (Test-Path ".expo") { 
    Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue 
}
if (Test-Path ".metro-cache") { 
    Remove-Item -Recurse -Force ".metro-cache" -ErrorAction SilentlyContinue 
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Blue
npm install

# Set environment
switch ($Environment) {
    "development" { $env:NODE_ENV = "development" }
    "preview" { $env:NODE_ENV = "staging" }
    "production" { $env:NODE_ENV = "production" }
}

# Build APK
Write-Host "Building APK for $Environment..." -ForegroundColor Blue
Write-Host "This will take several minutes..." -ForegroundColor Yellow

try {
    switch ($Environment) {
        "development" { 
            Write-Host "Running: npm run build:dev:android"
            npm run build:dev:android 
        }
        "preview" { 
            Write-Host "Running: npm run build:preview:android"
            npm run build:preview:android 
        }
        "production" { 
            Write-Host "Running: npm run build:prod:android"
            npm run build:prod:android 
        }
    }
    
    Write-Host ""
    Write-Host "SUCCESS: APK build completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Visit https://expo.dev to monitor build progress" -ForegroundColor White
    Write-Host "2. Download the APK when build completes" -ForegroundColor White
    Write-Host "3. Install on your Android device" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Build failed - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Make sure you're logged in: eas login" -ForegroundColor White
    Write-Host "- Check internet connection" -ForegroundColor White
    Write-Host "- Try: Remove-Item -Recurse node_modules; npm install" -ForegroundColor White
    exit 1
}