# PowerShell script to run the React Native mobile app on Android
Write-Host "Starting React Native mobile app for Android..." -ForegroundColor Green

# Check if we're in the mobile-client directory
if (!(Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Make sure you're in the mobile-client directory." -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
}

# Check if Android SDK is available
Write-Host "Checking Android development environment..." -ForegroundColor Yellow

# Start the Metro bundler in the background
Write-Host "Starting Metro bundler..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Minimized

# Wait a moment for Metro to start
Start-Sleep -Seconds 5

# Start the Android app
Write-Host "Starting Android app..." -ForegroundColor Yellow
Write-Host "Make sure you have:" -ForegroundColor Cyan
Write-Host "  1. Android Studio installed" -ForegroundColor Cyan
Write-Host "  2. Android device connected via USB with USB debugging enabled" -ForegroundColor Cyan
Write-Host "  3. Or Android emulator running" -ForegroundColor Cyan
Write-Host ""

npm run android

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to start Android app." -ForegroundColor Red
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "  1. Make sure Android Studio is installed" -ForegroundColor Yellow
    Write-Host "  2. Check if your Android device is connected and USB debugging is enabled" -ForegroundColor Yellow
    Write-Host "  3. Try running 'adb devices' to see connected devices" -ForegroundColor Yellow
    Write-Host "  4. Make sure you have accepted the Android SDK licenses" -ForegroundColor Yellow
    exit 1
}

Write-Host "Android app started successfully!" -ForegroundColor Green