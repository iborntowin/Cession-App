# Build v1.0.41 - Complete Error 32 Fix + Executable Path Fix
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Building v1.0.41 - Batch Script + Path Fix" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "This version fixes:" -ForegroundColor Yellow
Write-Host "  ✓ Error 32 (file locking) - Uses batch script approach" -ForegroundColor Green
Write-Host "  ✓ Executable path - Launches cession-app-frontend.exe correctly`n" -ForegroundColor Green

Write-Host "How it works:" -ForegroundColor Yellow
Write-Host "  1. App downloads installer" -ForegroundColor White
Write-Host "  2. App creates .bat script" -ForegroundColor White
Write-Host "  3. App exits (releases all file locks)" -ForegroundColor White
Write-Host "  4. Batch script runs installer" -ForegroundColor White
Write-Host "  5. Batch script launches: C:\Program Files\Cession Management App\cession-app-frontend.exe" -ForegroundColor White
Write-Host "  6. Success!`n" -ForegroundColor Green

Write-Host "Running release builder...`n" -ForegroundColor Green

# The release builder will prompt for:
# - Confirmation (y)
# - Release notes: Fixed Error 32 + executable path - Batch script now launches correct exe

node release-builder.js --patch

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "`nFiles to upload to GitHub:" -ForegroundColor Yellow
Write-Host "  1. Cession.Management.App_1.0.41_x64-setup.exe" -ForegroundColor Green
Write-Host "  2. latest.json" -ForegroundColor Green
Write-Host "`nCreate release at:" -ForegroundColor Yellow
Write-Host "  https://github.com/iborntowin/Cession-App/releases/new" -ForegroundColor Cyan
Write-Host "`nTag: v1.0.41" -ForegroundColor White
Write-Host "Title: Version 1.0.41 - Complete Update Fix" -ForegroundColor White
Write-Host "`n"
