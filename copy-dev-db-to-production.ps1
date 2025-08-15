# PowerShell script to copy development database to production location
# This ensures both environments use the same data

Write-Host "=== Database Copy Script ===" -ForegroundColor Green
Write-Host "This script copies the development database to the production location"
Write-Host ""

# Define paths
$devDbPath = "$env:USERPROFILE\.cession-app\data\db.mv.db"
$prodDbPath = "$env:APPDATA\com.nassimmaaoui.cessionapp\data\db.mv.db"
$prodDir = "$env:APPDATA\com.nassimmaaoui.cessionapp\data"

Write-Host "Development DB: $devDbPath" -ForegroundColor Yellow
Write-Host "Production DB:  $prodDbPath" -ForegroundColor Yellow
Write-Host ""

# Check if development database exists
if (-not (Test-Path $devDbPath)) {
    Write-Host "❌ Development database not found at: $devDbPath" -ForegroundColor Red
    Write-Host "Make sure you have run the development environment and created some data."
    exit 1
}

# Get file sizes for comparison
$devSize = (Get-Item $devDbPath).Length
Write-Host "Development database size: $([math]::Round($devSize/1KB, 2)) KB" -ForegroundColor Cyan

if (Test-Path $prodDbPath) {
    $prodSize = (Get-Item $prodDbPath).Length
    Write-Host "Production database size:  $([math]::Round($prodSize/1KB, 2)) KB" -ForegroundColor Cyan
    
    # Backup existing production database
    $backupPath = "$prodDir\db_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').mv.db"
    Write-Host ""
    Write-Host "Backing up existing production database to: $backupPath" -ForegroundColor Yellow
    Copy-Item $prodDbPath $backupPath
    Write-Host "✅ Backup created" -ForegroundColor Green
} else {
    Write-Host "No existing production database found" -ForegroundColor Yellow
}

# Create production directory if it doesn't exist
if (-not (Test-Path $prodDir)) {
    Write-Host ""
    Write-Host "Creating production data directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $prodDir -Force | Out-Null
    Write-Host "✅ Directory created" -ForegroundColor Green
}

# Copy development database to production
Write-Host ""
Write-Host "Copying development database to production location..." -ForegroundColor Yellow
try {
    Copy-Item $devDbPath $prodDbPath -Force
    Write-Host "✅ Database copied successfully!" -ForegroundColor Green
    
    # Verify the copy
    if (Test-Path $prodDbPath) {
        $newProdSize = (Get-Item $prodDbPath).Length
        Write-Host "New production database size: $([math]::Round($newProdSize/1KB, 2)) KB" -ForegroundColor Cyan
        
        if ($newProdSize -eq $devSize) {
            Write-Host "✅ File sizes match - copy verified!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  File sizes don't match - there might be an issue" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Failed to copy database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "1. Close the production app if it's running"
Write-Host "2. Start the production app"
Write-Host "3. Check if the danger clients now appear correctly"
Write-Host "4. If you need to revert, restore from the backup file created above"
Write-Host ""
Write-Host "Database locations:" -ForegroundColor Cyan
Write-Host "- Development: $devDbPath"
Write-Host "- Production:  $prodDbPath"

# Also copy any trace files if they exist
$devTraceFile = "$env:USERPROFILE\.cession-app\data\db.trace.db"
$prodTraceFile = "$env:APPDATA\com.nassimmaaoui.cessionapp\data\db.trace.db"

if (Test-Path $devTraceFile) {
    Write-Host ""
    Write-Host "Copying trace file..." -ForegroundColor Yellow
    Copy-Item $devTraceFile $prodTraceFile -Force
    Write-Host "✅ Trace file copied" -ForegroundColor Green
}

Write-Host ""
Write-Host "Script completed!" -ForegroundColor Green