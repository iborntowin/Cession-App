# Final Android APK Build Script
# This is the complete build process for production APK

param(
    [switch]$Clean,
    [switch]$Debug,
    [switch]$Install,
    [switch]$Test
)

Write-Host "🚀 Final Android APK Build Process" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"

try {
    # Step 1: Validate environment
    Write-Host "`n1️⃣ Validating environment..." -ForegroundColor Blue
    & ".\validate-android-setup.ps1"
    if ($LASTEXITCODE -ne 0) {
        throw "Environment validation failed"
    }

    # Step 2: Clean if requested
    if ($Clean) {
        Write-Host "`n2️⃣ Cleaning previous builds..." -ForegroundColor Blue
        Set-Location "frontend"
        
        if (Test-Path "src-tauri/gen/android") {
            Remove-Item -Recurse -Force "src-tauri/gen/android"
            Write-Host "✅ Cleaned Android build directory" -ForegroundColor Green
        }
        
        if (Test-Path "src-tauri/target") {
            Remove-Item -Recurse -Force "src-tauri/target"
            Write-Host "✅ Cleaned Rust target directory" -ForegroundColor Green
        }
        
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
            Write-Host "✅ Cleaned frontend dist directory" -ForegroundColor Green
        }
        
        Set-Location ".."
    }

    # Step 3: Build backend
    Write-Host "`n3️⃣ Building backend..." -ForegroundColor Blue
    Set-Location "backend"
    mvn clean package -DskipTests -Dspring.profiles.active=production
    if ($LASTEXITCODE -ne 0) {
        throw "Backend build failed"
    }
    
    # Copy backend JAR
    $jarSource = "target/cession-app-backend-0.0.1-SNAPSHOT.jar"
    $jarDest = "../frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
    
    if (Test-Path $jarSource) {
        Copy-Item $jarSource $jarDest -Force
        Write-Host "✅ Backend JAR copied to Tauri resources" -ForegroundColor Green
    } else {
        throw "Backend JAR not found at $jarSource"
    }
    
    Set-Location ".."

    # Step 4: Build frontend
    Write-Host "`n4️⃣ Building frontend..." -ForegroundColor Blue
    Set-Location "frontend"
    
    # Install dependencies
    npm ci
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install frontend dependencies"
    }
    
    # Build frontend
    npm run build:production
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed"
    }
    
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green

    # Step 5: Initialize Android
    Write-Host "`n5️⃣ Initializing Android target..." -ForegroundColor Blue
    tauri android init
    # Don't fail on init issues, they're often non-critical

    # Step 6: Build Android APK
    Write-Host "`n6️⃣ Building Android APK..." -ForegroundColor Blue
    
    if ($Debug) {
        Write-Host "Building debug APK..." -ForegroundColor Yellow
        tauri android build --apk --debug
    } else {
        Write-Host "Building release APK..." -ForegroundColor Yellow
        tauri android build --apk
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Android APK build failed"
    }
    
    Set-Location ".."

    # Step 7: Find and report APK
    Write-Host "`n7️⃣ Locating built APK..." -ForegroundColor Blue
    $apkFiles = Get-ChildItem -Path "frontend/src-tauri/gen" -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue
    
    if ($apkFiles) {
        $latestApk = $apkFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        Write-Host "✅ APK built successfully!" -ForegroundColor Green
        Write-Host "📱 APK Location: $($latestApk.FullName)" -ForegroundColor Cyan
        Write-Host "📊 APK Size: $([math]::Round($latestApk.Length / 1MB, 2)) MB" -ForegroundColor Cyan
        Write-Host "🕒 Build Time: $($latestApk.LastWriteTime)" -ForegroundColor Cyan
        
        # Step 8: Install if requested
        if ($Install) {
            Write-Host "`n8️⃣ Installing APK on device..." -ForegroundColor Blue
            & ".\test-android-apk.ps1" -ApkPath $latestApk.FullName -Install
        }
        
        # Step 9: Test if requested
        if ($Test) {
            Write-Host "`n9️⃣ Testing APK..." -ForegroundColor Blue
            & ".\test-android-apk.ps1" -ApkPath $latestApk.FullName -Install -Launch
        }
        
        Write-Host "`n🎉 Build completed successfully!" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "1. Install: .\test-android-apk.ps1 -Install" -ForegroundColor Cyan
        Write-Host "2. Test: .\test-android-apk.ps1 -Install -Launch" -ForegroundColor Cyan
        Write-Host "3. Debug: .\test-android-apk.ps1 -Logs" -ForegroundColor Cyan
        
    } else {
        throw "No APK files found after build"
    }

} catch {
    Write-Host "`n❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check that Android SDK is properly installed" -ForegroundColor Cyan
    Write-Host "2. Ensure ANDROID_HOME environment variable is set" -ForegroundColor Cyan
    Write-Host "3. Verify that a device is connected or emulator is running" -ForegroundColor Cyan
    Write-Host "4. Run .\validate-android-setup.ps1 to check your setup" -ForegroundColor Cyan
    exit 1
}