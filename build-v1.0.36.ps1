# Quick Build Script for v1.0.36 with File Handle Fix

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Building v1.0.36 - File Handle Fix" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Run the release builder
node release-builder.js --patch

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/iborntowin/Cession-App/releases/new" -ForegroundColor White
Write-Host "2. Tag: v1.0.36" -ForegroundColor White
Write-Host "3. Title: Version 1.0.36 - File Handle Fix" -ForegroundColor White
Write-Host "4. Upload files from: release-files\" -ForegroundColor White
Write-Host "   - Cession.Management.App_1.0.36_x64-setup.exe" -ForegroundColor Green
Write-Host "   - latest.json" -ForegroundColor Green
Write-Host "5. Publish and test!" -ForegroundColor White
Write-Host "`n"
