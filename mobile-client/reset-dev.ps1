#!/usr/bin/env pwsh

Write-Host "🔄 Resetting React Native development environment..." -ForegroundColor Yellow

# Clear all caches first
Write-Host "Step 1: Clearing caches..." -ForegroundColor Blue
& .\clear-cache.ps1

# Reinstall node modules
Write-Host "Step 2: Reinstalling dependencies..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
}

npm install

# Reset Metro bundler
Write-Host "Step 3: Resetting Metro bundler..." -ForegroundColor Blue
npx react-native start --reset-cache

Write-Host "🎉 Development environment reset complete!" -ForegroundColor Green
Write-Host "The Metro bundler should now be running with a clean cache." -ForegroundColor Cyan