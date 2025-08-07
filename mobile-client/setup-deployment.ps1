# Setup script for mobile app deployment
# This script ensures all prerequisites are installed and configured for mobile app deployment

Write-Host "Setting up Cession Manager Mobile App Deployment" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Blue
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Blue
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

# Install/Update EAS CLI
Write-Host "Checking EAS CLI..." -ForegroundColor Blue
try {
    $easVersion = eas --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "EAS CLI version: $easVersion" -ForegroundColor Green
        Write-Host "Updating EAS CLI..." -ForegroundColor Blue
        npm install -g @expo/eas-cli@latest
    } else {
        Write-Host "Installing EAS CLI..." -ForegroundColor Blue
        npm install -g @expo/eas-cli
    }
    Write-Host "EAS CLI ready" -ForegroundColor Green
} catch {
    Write-Host "Failed to install EAS CLI: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing project dependencies..." -ForegroundColor Blue
try {
    npm install
    Write-Host "Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check EAS authentication
Write-Host "Checking EAS authentication..." -ForegroundColor Blue
try {
    $whoami = eas whoami 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Authenticated as: $whoami" -ForegroundColor Green
    } else {
        Write-Host "Please login to EAS:" -ForegroundColor Yellow
        eas login
        $whoami = eas whoami
        Write-Host "Authenticated as: $whoami" -ForegroundColor Green
    }
} catch {
    Write-Host "Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please run 'eas login' manually" -ForegroundColor Yellow
}

# Update icons
Write-Host "Updating icons from desktop app..." -ForegroundColor Blue
$desktopIconsPath = "../frontend/src-tauri/icons"
if (Test-Path $desktopIconsPath) {
    Copy-Item "$desktopIconsPath/icon.png" "assets/icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/adaptive-icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/splash-icon.png" -Force
    Copy-Item "$desktopIconsPath/icon.png" "assets/favicon.png" -Force
    Write-Host "Icons updated from desktop app" -ForegroundColor Green
} else {
    Write-Host "Desktop icons not found at $desktopIconsPath" -ForegroundColor Yellow
    Write-Host "Using existing mobile app icons" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Available deployment commands:" -ForegroundColor Cyan
Write-Host "  Quick APK build:     .\build-apk.ps1" -ForegroundColor White
Write-Host "  Full deployment:     .\deploy-mobile-app.ps1" -ForegroundColor White
Write-Host "  Production build:    .\deploy-mobile-app.ps1 -Environment production" -ForegroundColor White
Write-Host ""
Write-Host "Ready for deployment!" -ForegroundColor Green