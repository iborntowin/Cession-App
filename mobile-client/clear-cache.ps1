#!/usr/bin/env pwsh

Write-Host "🧹 Clearing React Native Metro cache..." -ForegroundColor Yellow

# Stop any running Metro processes
Write-Host "Stopping Metro processes..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*metro*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear Metro cache
Write-Host "Clearing Metro cache..." -ForegroundColor Blue
if (Test-Path ".metro-cache") {
    Remove-Item -Recurse -Force ".metro-cache"
    Write-Host "✅ Metro cache cleared" -ForegroundColor Green
}

# Clear node_modules cache
Write-Host "Clearing node_modules cache..." -ForegroundColor Blue
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ Node modules cache cleared" -ForegroundColor Green
}

# Clear Expo cache
Write-Host "Clearing Expo cache..." -ForegroundColor Blue
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force ".expo"
    Write-Host "✅ Expo cache cleared" -ForegroundColor Green
}

# Clear React Native cache
Write-Host "Clearing React Native cache..." -ForegroundColor Blue
$tempDir = [System.IO.Path]::GetTempPath()
$rnCacheDir = Join-Path $tempDir "react-native-*"
Get-ChildItem -Path $tempDir -Directory -Name "react-native-*" -ErrorAction SilentlyContinue | ForEach-Object {
    $fullPath = Join-Path $tempDir $_
    Remove-Item -Recurse -Force $fullPath -ErrorAction SilentlyContinue
}

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Blue
npm cache clean --force 2>$null

# Clear watchman cache if available
Write-Host "Clearing watchman cache..." -ForegroundColor Blue
try {
    watchman watch-del-all 2>$null
    Write-Host "✅ Watchman cache cleared" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Watchman not available, skipping..." -ForegroundColor Yellow
}

Write-Host "🎉 Cache clearing complete!" -ForegroundColor Green
Write-Host "You can now run: npm start" -ForegroundColor Cyan