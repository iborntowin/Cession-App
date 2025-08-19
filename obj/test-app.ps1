#!/usr/bin/env pwsh
# Quick test script for the fixed application

Write-Host "Testing the fixed Cession Management App..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Write-Host "Stopping any existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*cession*" -or $_.ProcessName -like "*java*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Start the app
Write-Host "Starting the application..." -ForegroundColor Yellow
Start-Process "dist/cession-app.exe"

Write-Host ""
Write-Host "Application started!" -ForegroundColor Green
Write-Host ""
Write-Host "What to expect:" -ForegroundColor White
Write-Host "1. App window should open" -ForegroundColor Gray
Write-Host "2. Backend will start (may take 10-15 seconds)" -ForegroundColor Gray
Write-Host "3. Status should change from 'Starting...' to 'System Ready'" -ForegroundColor Gray
Write-Host "4. Login screen should be functional" -ForegroundColor Gray
Write-Host ""
Write-Host "If you still see connection issues, the backend may need more time to start." -ForegroundColor Yellow
Write-Host "Wait for the status to show 'System Ready' before trying to login." -ForegroundColor Yellow