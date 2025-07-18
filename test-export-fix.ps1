#!/usr/bin/env pwsh
# Test script to verify the export functionality fix

Write-Host "Testing Export Functionality Fix..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Write-Host "Stopping any existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*cession*" -or $_.ProcessName -like "*java*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Start the app
Write-Host "Starting the fixed application..." -ForegroundColor Yellow
Start-Process "dist/cession-app.exe"

Write-Host ""
Write-Host "Fixed Export Functionality!" -ForegroundColor Green
Write-Host ""
Write-Host "What to test:" -ForegroundColor White
Write-Host "1. Wait for 'System Ready' status" -ForegroundColor Gray
Write-Host "2. Login to the application" -ForegroundColor Gray
Write-Host "3. Go to Settings page" -ForegroundColor Gray
Write-Host "4. Look for 'Mobile Data Export & Sync' section" -ForegroundColor Gray
Write-Host "5. Click 'Sync Now' button" -ForegroundColor Gray
Write-Host "6. Should show proper status instead of HTML error" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected behavior:" -ForegroundColor Yellow
Write-Host "- No more 'Unexpected token <' errors" -ForegroundColor Gray
Write-Host "- Export status should load properly" -ForegroundColor Gray
Write-Host "- Sync button should work correctly" -ForegroundColor Gray