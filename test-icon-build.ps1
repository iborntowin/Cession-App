#!/usr/bin/env pwsh

Write-Host "🔧 Testing Tauri Icon Build..." -ForegroundColor Cyan

# Navigate to frontend directory
Set-Location frontend

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force src-tauri/target -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Build the frontend
Write-Host "🏗️ Building frontend..." -ForegroundColor Yellow
npm run build

# Build Tauri app
Write-Host "🚀 Building Tauri app with custom icon..." -ForegroundColor Yellow
Set-Location src-tauri
cargo tauri build

Write-Host "✅ Build complete! Check the generated executable in src-tauri/target/release/" -ForegroundColor Green
Write-Host "📁 The executable should now have your custom icon!" -ForegroundColor Green