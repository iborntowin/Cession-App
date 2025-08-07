# PowerShell script to run the React Native mobile app on iOS
Write-Host "Starting React Native mobile app for iOS..." -ForegroundColor Green

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

# Start the iOS app
Write-Host "Starting iOS app..." -ForegroundColor Yellow
npm run ios

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to start iOS app." -ForegroundColor Red
    exit 1
}

Write-Host "iOS app started successfully!" -ForegroundColor Green