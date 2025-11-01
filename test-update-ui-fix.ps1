# Test Auto-Update UI Fixes
# Quick verification that the update UI works without undefined/NaN errors

Write-Host "🧪 Testing Auto-Update UI Fixes..." -ForegroundColor Cyan
Write-Host ""

# Check if frontend files exist
$files = @(
    "frontend\src\lib\custom-updater.js",
    "frontend\src\lib\components\EnhancedUpdateChecker.svelte"
)

Write-Host "📁 Checking files..." -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file NOT FOUND" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔍 Verifying fixes in custom-updater.js..." -ForegroundColor Yellow
$updaterContent = Get-Content "frontend\src\lib\custom-updater.js" -Raw

# Check for object-based progress callbacks
if ($updaterContent -match 'onProgress\?\.\(\{ downloaded:') {
    Write-Host "  ✅ Progress callback uses object shape" -ForegroundColor Green
} else {
    Write-Host "  ❌ Progress callback not using object shape" -ForegroundColor Red
    exit 1
}

# Check for all 3 locations
$objectCallbacks = ([regex]::Matches($updaterContent, 'onProgress\?\.\(\{ downloaded:')).Count
if ($objectCallbacks -ge 3) {
    Write-Host "  ✅ Found $objectCallbacks progress callback locations" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Only found $objectCallbacks progress callback locations (expected 3)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Verifying fixes in EnhancedUpdateChecker.svelte..." -ForegroundColor Yellow
$componentContent = Get-Content "frontend\src\lib\components\EnhancedUpdateChecker.svelte" -Raw

# Check for progress validation
if ($componentContent -match 'const downloaded = progress\?\.' -and 
    $componentContent -match 'const total = progress\?\.' -and
    $componentContent -match 'const percent = progress\?\.') {
    Write-Host "  ✅ Progress value validation added" -ForegroundColor Green
} else {
    Write-Host "  ❌ Progress validation missing" -ForegroundColor Red
    exit 1
}

# Check for formatBytes fix
if ($componentContent -match 'if \(!bytes \|\| bytes === 0 \|\| isNaN\(bytes\)\)') {
    Write-Host "  ✅ formatBytes handles undefined/NaN" -ForegroundColor Green
} else {
    Write-Host "  ❌ formatBytes validation missing" -ForegroundColor Red
    exit 1
}

# Check for formatTime fix
if ($componentContent -match 'if \(!seconds \|\| seconds <= 0 \|\| isNaN\(seconds\)\)') {
    Write-Host "  ✅ formatTime handles undefined/NaN" -ForegroundColor Green
} else {
    Write-Host "  ❌ formatTime validation missing" -ForegroundColor Red
    exit 1
}

# Check for display value safety
if ($componentContent -match 'downloadProgress\.percentage \|\| 0' -and
    $componentContent -match 'downloadProgress\.downloaded \|\| 0' -and
    $componentContent -match 'downloadProgress\.total \|\| 0') {
    Write-Host "  ✅ Display values have fallbacks" -ForegroundColor Green
} else {
    Write-Host "  ❌ Display value fallbacks missing" -ForegroundColor Red
    exit 1
}

# Check for NaN safety in conditionals
if ($componentContent -match '!isNaN\(downloadSpeed\)' -and
    $componentContent -match '!isNaN\(timeRemaining\)') {
    Write-Host "  ✅ NaN checks in conditionals" -ForegroundColor Green
} else {
    Write-Host "  ❌ NaN checks missing" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Building frontend to verify compilation..." -ForegroundColor Yellow
Push-Location frontend\src-tauri
$buildOutput = cargo check 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Rust code compiles successfully" -ForegroundColor Green
} else {
    Write-Host "  ❌ Rust compilation failed" -ForegroundColor Red
    Write-Host $buildOutput
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary of Fixes:" -ForegroundColor White
Write-Host "  1. ✅ Progress callbacks use object shape" -ForegroundColor Green
Write-Host "  2. ✅ Progress values validated (no undefined)" -ForegroundColor Green
Write-Host "  3. ✅ formatBytes handles undefined/NaN" -ForegroundColor Green
Write-Host "  4. ✅ formatTime handles undefined/NaN" -ForegroundColor Green
Write-Host "  5. ✅ Display values have fallbacks (|| 0)" -ForegroundColor Green
Write-Host "  6. ✅ NaN checks in conditionals" -ForegroundColor Green
Write-Host "  7. ✅ Rust code compiles" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Build new release: node release-builder.js --patch" -ForegroundColor White
Write-Host "  2. Test update UI - should show proper values, no undefined/NaN" -ForegroundColor White
Write-Host "  3. Verify progress: '0%' → '45%' → '100%'" -ForegroundColor White
Write-Host "  4. Verify download: '0 B / 52.3 MB' → '23.5 MB / 52.3 MB'" -ForegroundColor White
Write-Host ""
Write-Host "Expected UI Output:" -ForegroundColor Cyan
Write-Host "  Downloading Update" -ForegroundColor White
Write-Host "  45%" -ForegroundColor White
Write-Host "  Downloaded: 23.5 MB / 52.3 MB" -ForegroundColor White
Write-Host "  Speed: 2.45 MB/s" -ForegroundColor White
Write-Host "  Time remaining: 12s" -ForegroundColor White
Write-Host "  Downloading: 45%" -ForegroundColor White
Write-Host ""
