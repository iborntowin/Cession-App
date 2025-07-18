#!/usr/bin/env pwsh
# Quick script to open the Cession App data folder

$dataPath = "$env:APPDATA\com.electro.cessionapp"

Write-Host "Opening Cession App data folder..." -ForegroundColor Cyan
Write-Host "Location: $dataPath" -ForegroundColor Yellow

if (Test-Path $dataPath) {
    # Open the folder in Windows Explorer
    Start-Process "explorer.exe" -ArgumentList $dataPath
    
    Write-Host ""
    Write-Host "Data folder contents:" -ForegroundColor Green
    Get-ChildItem $dataPath -ErrorAction SilentlyContinue | ForEach-Object {
        $size = if ($_.PSIsContainer) { 
            $itemCount = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
            "($itemCount items)"
        } else { 
            "$([math]::Round($_.Length / 1KB, 1)) KB" 
        }
        Write-Host "  📁 $($_.Name) - $size" -ForegroundColor White
    }
} else {
    Write-Host "Data folder not found. The app may not have been run yet." -ForegroundColor Red
    Write-Host "Run the application first to create the data folder." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Important files:" -ForegroundColor Cyan
Write-Host "  • data\db.mv.db - Main database (your data)" -ForegroundColor Gray
Write-Host "  • backups\ - Automatic daily backups" -ForegroundColor Gray
Write-Host "  • uploads\ - Uploaded documents" -ForegroundColor Gray
Write-Host "  • logs\ - Application logs" -ForegroundColor Gray