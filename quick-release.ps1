# Quick Release Build Script
# Usage: .\quick-release.ps1

Write-Host "`n🚀 Starting Automated Release Build...`n" -ForegroundColor Cyan

# Run the main build script with default settings (patch increment)
& "$PSScriptRoot\build-release.ps1"
