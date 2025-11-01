# Test Custom Updater Build Script
# Quick build to test the new custom updater implementation

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Testing Custom Updater Build (v1.0.23)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location -Path "c:\Projects\Cession-App\frontend"

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Building Tauri app with custom updater..." -ForegroundColor Yellow
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Build artifacts location:" -ForegroundColor Cyan
Write-Host "  MSI: src-tauri\target\release\bundle\msi\" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Install the MSI" -ForegroundColor White
Write-Host "  2. Create v1.0.23 release on GitHub with:" -ForegroundColor White
Write-Host "     - Cession-Management-App_1.0.23_x64_en-US.msi.zip" -ForegroundColor White
Write-Host "     - latest.json (without signature)" -ForegroundColor White
Write-Host "  3. Test update check in running app" -ForegroundColor White
Write-Host ""
