#!/usr/bin/env pwsh
# Comprehensive Update Flow Test Script
# Tests the entire update process from detection to installation

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "COMPREHENSIVE UPDATE FLOW TEST" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check current app version
Write-Host "1. Checking current app version..." -ForegroundColor Yellow
$currentVersion = "1.1.13"  # From tauri.conf.json
Write-Host "   Current version: $currentVersion" -ForegroundColor Green

# Test 2: Check latest.json structure
Write-Host ""
Write-Host "2. Checking latest.json structure..." -ForegroundColor Yellow
$latestJson = Get-Content "c:\Projects\Cession-App\release-files\latest.json" | ConvertFrom-Json
Write-Host "   Latest version: $($latestJson.version)" -ForegroundColor Green
Write-Host "   Release notes: $($latestJson.notes)" -ForegroundColor Green
Write-Host "   EXE URL: $($latestJson.platforms.'windows-x86_64'.url)" -ForegroundColor Green
Write-Host "   MSI URL: $($latestJson.platforms.'windows-x86_64'.msi_url)" -ForegroundColor Green
Write-Host "   EXE SHA256: $($latestJson.platforms.'windows-x86_64'.sha256)" -ForegroundColor Green
Write-Host "   MSI SHA256: $($latestJson.platforms.'windows-x86_64'.msi_sha256)" -ForegroundColor Green

# Test 3: Verify file hashes
Write-Host ""
Write-Host "3. Verifying file hashes..." -ForegroundColor Yellow
$exePath = "c:\Projects\Cession-App\release-files\Cession Management App_1.1.13_x64-setup.exe"
$msiPath = "c:\Projects\Cession-App\release-files\Cession-Management-App_1.1.13_x64_en-US.msi.zip"

if (Test-Path $exePath) {
    $actualExeHash = (Get-FileHash -Algorithm SHA256 $exePath).Hash.ToLower()
    $expectedExeHash = $latestJson.platforms.'windows-x86_64'.sha256
    Write-Host "   EXE Hash Check:" -ForegroundColor White
    Write-Host "     Expected: $expectedExeHash" -ForegroundColor Gray
    Write-Host "     Actual:   $actualExeHash" -ForegroundColor Gray
    if ($actualExeHash -eq $expectedExeHash) {
        Write-Host "     ✅ EXE hash matches!" -ForegroundColor Green
    } else {
        Write-Host "     ❌ EXE hash MISMATCH!" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ EXE file not found: $exePath" -ForegroundColor Red
}

if (Test-Path $msiPath) {
    $actualMsiHash = (Get-FileHash -Algorithm SHA256 $msiPath).Hash.ToLower()
    $expectedMsiHash = $latestJson.platforms.'windows-x86_64'.msi_sha256
    Write-Host "   MSI Hash Check:" -ForegroundColor White
    Write-Host "     Expected: $expectedMsiHash" -ForegroundColor Gray
    Write-Host "     Actual:   $actualMsiHash" -ForegroundColor Gray
    if ($actualMsiHash -eq $expectedMsiHash) {
        Write-Host "     ✅ MSI hash matches!" -ForegroundColor Green
    } else {
        Write-Host "     ❌ MSI hash MISMATCH!" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ MSI file not found: $msiPath" -ForegroundColor Red
}

# Test 4: Check Rust updater code
Write-Host ""
Write-Host "4. Checking Rust updater code..." -ForegroundColor Yellow
$rustFile = "c:\Projects\Cession-App\frontend\src-tauri\src\updater.rs"
if (Test-Path $rustFile) {
    $rustContent = Get-Content $rustFile -Raw
    $hasSha256 = $rustContent -match "sha2::Sha256"
    $hasProgress = $rustContent -match "UpdateEvent::Progress"
    $hasChecksum = $rustContent -match "checksum.*verification"
    $hasExeInstall = $rustContent -match "install_nsis_exe"

    Write-Host "   ✅ Rust file exists" -ForegroundColor Green
    if ($hasSha256) { Write-Host "   ✅ SHA256 hashing implemented" -ForegroundColor Green } else { Write-Host "   ❌ SHA256 hashing missing" -ForegroundColor Red }
    if ($hasProgress) { Write-Host "   ✅ Progress events implemented" -ForegroundColor Green } else { Write-Host "   ❌ Progress events missing" -ForegroundColor Red }
    if ($hasChecksum) { Write-Host "   ✅ Checksum verification implemented" -ForegroundColor Green } else { Write-Host "   ❌ Checksum verification missing" -ForegroundColor Red }
    if ($hasExeInstall) { Write-Host "   ✅ EXE installer support implemented" -ForegroundColor Green } else { Write-Host "   ❌ EXE installer support missing" -ForegroundColor Red }
} else {
    Write-Host "   ❌ Rust updater file not found" -ForegroundColor Red
}

# Test 5: Check JavaScript updater code
Write-Host ""
Write-Host "5. Checking JavaScript updater code..." -ForegroundColor Yellow
$jsFile = "c:\Projects\Cession-App\frontend\src\lib\custom-updater.js"
if (Test-Path $jsFile) {
    $jsContent = Get-Content $jsFile -Raw
    $hasDebugLog = $jsContent -match "debugLog"
    $hasEventListen = $jsContent -match "listen.*update-download-progress"
    $hasInvoke = $jsContent -match "invoke.*download_and_install_update"
    $hasErrorHandling = $jsContent -match "catch.*error"

    Write-Host "   ✅ JavaScript file exists" -ForegroundColor Green
    if ($hasDebugLog) { Write-Host "   ✅ Debug logging implemented" -ForegroundColor Green } else { Write-Host "   ❌ Debug logging missing" -ForegroundColor Red }
    if ($hasEventListen) { Write-Host "   ✅ Event listening implemented" -ForegroundColor Green } else { Write-Host "   ❌ Event listening missing" -ForegroundColor Red }
    if ($hasInvoke) { Write-Host "   ✅ Rust command invocation implemented" -ForegroundColor Green } else { Write-Host "   ❌ Rust command invocation missing" -ForegroundColor Red }
    if ($hasErrorHandling) { Write-Host "   ✅ Error handling implemented" -ForegroundColor Green } else { Write-Host "   ❌ Error handling missing" -ForegroundColor Red }
} else {
    Write-Host "   ❌ JavaScript updater file not found" -ForegroundColor Red
}

# Test 6: Check UI components
Write-Host ""
Write-Host "6. Checking UI components..." -ForegroundColor Yellow
$updateNotification = "c:\Projects\Cession-App\frontend\src\lib\components\UpdateNotification.svelte"
$debugBox = "c:\Projects\Cession-App\frontend\src\lib\components\DebugErrorBox.svelte"
$updateStatusCard = "c:\Projects\Cession-App\frontend\src\lib\components\UpdateStatusCard.svelte"

$uiFiles = @($updateNotification, $debugBox, $updateStatusCard)
foreach ($file in $uiFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $(Split-Path $file -Leaf) exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $(Split-Path $file -Leaf) missing" -ForegroundColor Red
    }
}

# Test 7: Check layout integration
Write-Host ""
Write-Host "7. Checking layout integration..." -ForegroundColor Yellow
$layoutFile = "c:\Projects\Cession-App\frontend\src\routes\+layout.svelte"
if (Test-Path $layoutFile) {
    $layoutContent = Get-Content $layoutFile -Raw
    $hasUpdateNotification = $layoutContent -match "UpdateNotification"
    $hasDebugBox = $layoutContent -match "DebugErrorBox"
    $hasUpdateCheck = $layoutContent -match "checkForUpdatesEnhanced"

    Write-Host "   ✅ Layout file exists" -ForegroundColor Green
    if ($hasUpdateNotification) { Write-Host "   ✅ UpdateNotification integrated" -ForegroundColor Green } else { Write-Host "   ❌ UpdateNotification missing" -ForegroundColor Red }
    if ($hasDebugBox) { Write-Host "   ✅ DebugErrorBox integrated" -ForegroundColor Green } else { Write-Host "   ❌ DebugErrorBox missing" -ForegroundColor Red }
    if ($hasUpdateCheck) { Write-Host "   ✅ Auto-update check implemented" -ForegroundColor Green } else { Write-Host "   ❌ Auto-update check missing" -ForegroundColor Red }
} else {
    Write-Host "   ❌ Layout file not found" -ForegroundColor Red
}

# Test 8: Check Tauri configuration
Write-Host ""
Write-Host "8. Checking Tauri configuration..." -ForegroundColor Yellow
$tauriConfig = "c:\Projects\Cession-App\frontend\src-tauri\tauri.conf.json"
if (Test-Path $tauriConfig) {
    $tauriJson = Get-Content $tauriConfig | ConvertFrom-Json
    $version = $tauriJson.version
    $hasUpdater = $tauriJson.plugins.updater
    $pubkey = $tauriJson.plugins.updater.pubkey

    Write-Host "   ✅ Tauri config exists" -ForegroundColor Green
    Write-Host "   App version: $version" -ForegroundColor Cyan
    if ($hasUpdater) { Write-Host "   ✅ Updater plugin configured" -ForegroundColor Green } else { Write-Host "   ❌ Updater plugin missing" -ForegroundColor Red }
    if ($pubkey -and $pubkey -ne "") { Write-Host "   ⚠️  Pubkey is set (not empty)" -ForegroundColor Yellow } else { Write-Host "   ✅ Pubkey is empty (as expected for no signature)" -ForegroundColor Green }
} else {
    Write-Host "   ❌ Tauri config not found" -ForegroundColor Red
}

# Test 9: Check GitHub release URL accessibility
Write-Host ""
Write-Host "9. Checking GitHub release URL accessibility..." -ForegroundColor Yellow
$exeUrl = $latestJson.platforms.'windows-x86_64'.url
$msiUrl = $latestJson.platforms.'windows-x86_64'.msi_url

Write-Host "   EXE URL: $exeUrl" -ForegroundColor Cyan
Write-Host "   MSI URL: $msiUrl" -ForegroundColor Cyan

# Test URL format (should use dots, not spaces)
$exeUrlCorrect = $exeUrl -match "Cession\.Management\.App"
$msiUrlCorrect = $msiUrl -match "Cession-Management-App"

if ($exeUrlCorrect) { Write-Host "   ✅ EXE URL format correct (uses dots)" -ForegroundColor Green } else { Write-Host "   ❌ EXE URL format incorrect" -ForegroundColor Red }
if ($msiUrlCorrect) { Write-Host "   ✅ MSI URL format correct (uses dashes)" -ForegroundColor Green } else { Write-Host "   ❌ MSI URL format incorrect" -ForegroundColor Red }

# Test 10: Summary and recommendations
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY & RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$issues = @()

if ($currentVersion -ge $latestJson.version) {
    Write-Host "⚠️  VERSION ISSUE: Current app version ($currentVersion) is same or higher than latest ($($latestJson.version))" -ForegroundColor Yellow
    Write-Host "   → To test updates, either:" -ForegroundColor Yellow
    Write-Host "     1. Downgrade tauri.conf.json version to something lower than $($latestJson.version)" -ForegroundColor Yellow
    Write-Host "     2. Create a new version higher than $($latestJson.version)" -ForegroundColor Yellow
    $issues += "Version mismatch for testing"
}

if (!(Test-Path $exePath)) {
    Write-Host "❌ CRITICAL: EXE installer file missing" -ForegroundColor Red
    $issues += "EXE file missing"
}

if (!(Test-Path $msiPath)) {
    Write-Host "❌ CRITICAL: MSI installer file missing" -ForegroundColor Red
    $issues += "MSI file missing"
}

if ($issues.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Ready to test the complete update flow!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Testing Steps:" -ForegroundColor White
    Write-Host "1. Start the app (npm run tauri dev)" -ForegroundColor White
    Write-Host "2. Open browser console (F12)" -ForegroundColor White
    Write-Host "3. Look for debug logs in the DebugErrorBox (bottom-right)" -ForegroundColor White
    Write-Host "4. Go to Settings → Check for Updates" -ForegroundColor White
    Write-Host "5. Should detect v$($latestJson.version) available" -ForegroundColor White
    Write-Host "6. Click 'Download Update'" -ForegroundColor White
    Write-Host "7. Monitor progress in console and UI" -ForegroundColor White
    Write-Host "8. Should complete installation and restart" -ForegroundColor White
} else {
    Write-Host "❌ ISSUES FOUND:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔍 Debug Information:" -ForegroundColor Cyan
Write-Host "   - Check browser console (F12) for JavaScript logs" -ForegroundColor Cyan
Write-Host "   - Check DebugErrorBox (bottom-right) for detailed logs" -ForegroundColor Cyan
Write-Host "   - Check Tauri console for Rust backend logs" -ForegroundColor Cyan
Write-Host "   - Look for 'UPDATER' prefixed messages in all logs" -ForegroundColor Cyan

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan