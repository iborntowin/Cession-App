# PowerShell script to test data loading from Supabase
Write-Host "Testing data loading from Supabase..." -ForegroundColor Green

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Install node-fetch if needed
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install node-fetch --no-save

# Run the debug script
Write-Host "Running data loading test..." -ForegroundColor Yellow
node mobile-client/debug-data-loading.js

Write-Host "Data loading test completed!" -ForegroundColor Green