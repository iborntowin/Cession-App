# Diagnostic script for Cession App white screen issue
# This will help identify why the app isn't starting

Write-Host "Cession App Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Java Installation
Write-Host "1. Checking Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    if ($javaVersion) {
        Write-Host "   ✅ Java is installed: $javaVersion" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Java not found!" -ForegroundColor Red
        Write-Host "   Please install Java 17 or higher from: https://adoptium.net/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Java not found in PATH!" -ForegroundColor Red
    Write-Host "   Please install Java 17 or higher from: https://adoptium.net/" -ForegroundColor Yellow
}

Write-Host ""

# 2. Check if JAR exists in build
Write-Host "2. Checking Backend JAR..." -ForegroundColor Yellow
$jarPath = "C:\Projects\Cession-App\frontend\src-tauri\backend\cession-app-backend-0.0.1-SNAPSHOT.jar"
if (Test-Path $jarPath) {
    $jarSize = (Get-Item $jarPath).Length / 1MB
    Write-Host "   ✅ JAR file found: $([math]::Round($jarSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "   ❌ JAR file NOT found at: $jarPath" -ForegroundColor Red
    Write-Host "   The backend JAR is missing from the build!" -ForegroundColor Yellow
}

Write-Host ""

# 3. Check installed app location
Write-Host "3. Checking Installed App..." -ForegroundColor Yellow
$possibleLocations = @(
    "$env:LOCALAPPDATA\Programs\Cession Management App",
    "$env:ProgramFiles\Cession Management App",
    "${env:ProgramFiles(x86)}\Cession Management App"
)

$found = $false
foreach ($loc in $possibleLocations) {
    if (Test-Path $loc) {
        Write-Host "   ✅ App installed at: $loc" -ForegroundColor Green
        $found = $true
        
        # Check if backend JAR exists in installed location
        $installedJar = Get-ChildItem -Path $loc -Filter "*.jar" -Recurse -ErrorAction SilentlyContinue
        if ($installedJar) {
            Write-Host "   ✅ Backend JAR found in installation" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Backend JAR NOT found in installation!" -ForegroundColor Red
        }
        break
    }
}

if (-not $found) {
    Write-Host "   ⚠️  App installation not found in standard locations" -ForegroundColor Yellow
}

Write-Host ""

# 4. Check log files
Write-Host "4. Checking Log Files..." -ForegroundColor Yellow
$appDataPath = "$env:LOCALAPPDATA\com.nassimmaaoui.cessionapp"
if (Test-Path $appDataPath) {
    Write-Host "   ✅ App data folder exists: $appDataPath" -ForegroundColor Green
    
    $logFiles = Get-ChildItem -Path $appDataPath -Filter "*.log" -Recurse -ErrorAction SilentlyContinue
    if ($logFiles) {
        Write-Host "   Log files found:" -ForegroundColor Cyan
        foreach ($log in $logFiles | Select-Object -First 5) {
            Write-Host "      - $($log.Name) ($(([math]::Round($log.Length / 1KB, 2))) KB)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "   Check these logs for error messages:" -ForegroundColor Yellow
        Write-Host "      $appDataPath" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  No log files found yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  App data folder not created yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Common causes of white screen:" -ForegroundColor Yellow
Write-Host "1. Java not installed or not in PATH" -ForegroundColor Gray
Write-Host "2. Backend JAR missing from build" -ForegroundColor Gray
Write-Host "3. Backend JAR failing to start (check logs)" -ForegroundColor Gray
Write-Host "4. Port 8082 already in use" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. If Java is missing, install it from: https://adoptium.net/" -ForegroundColor Gray
Write-Host "2. If JAR is missing, rebuild: npm run tauri build" -ForegroundColor Gray
Write-Host "3. Check log files in: $appDataPath" -ForegroundColor Gray
Write-Host "4. Try running the backend JAR manually to see errors:" -ForegroundColor Gray
Write-Host "   java -jar `"$jarPath`"" -ForegroundColor DarkGray
Write-Host ""
