# PowerShell script to start Metro bundler for React Native
Write-Host "Starting Metro bundler..." -ForegroundColor Green

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

Write-Host "Starting Metro bundler..." -ForegroundColor Yellow
Write-Host "Once Metro is running, you can:" -ForegroundColor Cyan
Write-Host "  1. Connect your Android phone via USB" -ForegroundColor Cyan
Write-Host "  2. Enable USB debugging on your phone" -ForegroundColor Cyan
Write-Host "  3. Run 'npm run android' in another terminal" -ForegroundColor Cyan
Write-Host "  4. Or scan the QR code with Expo Go app" -ForegroundColor Cyan
Write-Host ""

npm start