# Build v1.0.38 - Complete Error 32 Fix
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Building v1.0.38 - Batch Script Updater" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "This fix uses a BATCH SCRIPT approach:" -ForegroundColor Yellow
Write-Host "  1. App downloads installer" -ForegroundColor White
Write-Host "  2. App creates .bat script" -ForegroundColor White
Write-Host "  3. App exits (releases all file locks)" -ForegroundColor White
Write-Host "  4. Batch script runs installer" -ForegroundColor White
Write-Host "  5. New version launches automatically`n" -ForegroundColor White

Write-Host "Running release builder...`n" -ForegroundColor Green

# The release builder will prompt for:
# - Confirmation (y)
# - Release notes: COMPLETE FIX for Error 32 - Uses batch script to run installer after app exits

node release-builder.js --patch

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "`nFiles to upload to GitHub:" -ForegroundColor Yellow
Write-Host "  1. Cession.Management.App_1.0.38_x64-setup.exe" -ForegroundColor Green
Write-Host "  2. latest.json" -ForegroundColor Green
Write-Host "`nCreate release at:" -ForegroundColor Yellow
Write-Host "  https://github.com/iborntowin/Cession-App/releases/new" -ForegroundColor Cyan
Write-Host "`nTag: v1.0.38" -ForegroundColor White
Write-Host "Title: Version 1.0.38 - Complete Error 32 Fix" -ForegroundColor White
Write-Host "`n"
