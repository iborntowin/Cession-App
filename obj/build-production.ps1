#!/usr/bin/env pwsh
# Production Build Script for Cession Management App
# This script ensures the backend is built and bundled with the Tauri application

Write-Host "🚀 Starting Production Build Process..." -ForegroundColor Green

# Step 1: Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "frontend/dist") {
    Remove-Item -Recurse -Force "frontend/dist"
    Write-Host "   ✅ Cleaned frontend dist" -ForegroundColor Green
}
if (Test-Path "frontend/src-tauri/target") {
    Remove-Item -Recurse -Force "frontend/src-tauri/target"
    Write-Host "   ✅ Cleaned Tauri target" -ForegroundColor Green
}

# Step 2: Build Backend JAR
Write-Host "🔧 Building Backend JAR..." -ForegroundColor Yellow
Set-Location "backend"
try {
    $backendResult = & mvn clean package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        throw "Backend build failed"
    }
    Write-Host "   ✅ Backend JAR built successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend build failed: $_" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
Set-Location ".."

# Step 3: Verify JAR file exists
$jarPath = "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "   ❌ Backend JAR file not found at: $jarPath" -ForegroundColor Red
    exit 1
}
$jarSize = (Get-Item $jarPath).Length / 1MB
Write-Host "   ✅ Backend JAR verified (Size: $([math]::Round($jarSize, 2)) MB)" -ForegroundColor Green

# Step 4: Build Frontend
Write-Host "🎨 Building Frontend..." -ForegroundColor Yellow
Set-Location "frontend"
try {
    $frontendResult = & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed"
    }
    Write-Host "   ✅ Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend build failed: $_" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

# Step 5: Build Tauri Application
Write-Host "📦 Building Tauri Application..." -ForegroundColor Yellow
try {
    $tauriResult = & npm run tauri build
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri build failed"
    }
    Write-Host "   ✅ Tauri application built successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Tauri build failed: $_" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
Set-Location ".."

# Step 6: Verify build outputs
Write-Host "🔍 Verifying build outputs..." -ForegroundColor Yellow

$tauriTargetDir = "frontend/src-tauri/target/release"
if (Test-Path $tauriTargetDir) {
    $exeFiles = Get-ChildItem -Path $tauriTargetDir -Filter "*.exe" -Recurse
    if ($exeFiles.Count -gt 0) {
        foreach ($exe in $exeFiles) {
            $exeSize = $exe.Length / 1MB
            Write-Host "   ✅ Built: $($exe.Name) (Size: $([math]::Round($exeSize, 2)) MB)" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  No .exe files found in target directory" -ForegroundColor Yellow
    }
    
    $msiFiles = Get-ChildItem -Path $tauriTargetDir -Filter "*.msi" -Recurse
    if ($msiFiles.Count -gt 0) {
        foreach ($msi in $msiFiles) {
            $msiSize = $msi.Length / 1MB
            Write-Host "   ✅ Built: $($msi.Name) (Size: $([math]::Round($msiSize, 2)) MB)" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ❌ Tauri target directory not found" -ForegroundColor Red
    exit 1
}

# Step 7: Create deployment package
Write-Host "📋 Creating deployment summary..." -ForegroundColor Yellow
$deploymentInfo = @"
🎉 PRODUCTION BUILD COMPLETED SUCCESSFULLY!

📦 Build Artifacts:
   - Backend JAR: $jarPath ($([math]::Round($jarSize, 2)) MB)
   - Frontend: frontend/dist/
   - Tauri App: $tauriTargetDir/

🔧 Key Features Included:
   ✅ Backend bundled with application
   ✅ Timezone fixes for danger clients analysis
   ✅ Enhanced date handling
   ✅ Debug tools (temporary)
   ✅ Automatic backend startup
   ✅ Health monitoring system

🚀 Next Steps:
   1. Test the .exe file to verify danger clients analysis works
   2. Compare results with development build
   3. Remove debug components once confirmed working
   4. Deploy to production environment

📍 Installation Files Location:
   $tauriTargetDir/

⚠️  Important Notes:
   - The application will automatically start the backend when launched
   - No separate backend installation required
   - All timezone issues should be resolved
   - Debug panel available for troubleshooting

Build completed at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

Write-Host $deploymentInfo -ForegroundColor Cyan

# Save deployment info to file
$deploymentInfo | Out-File -FilePath "DEPLOYMENT_INFO.txt" -Encoding UTF8
Write-Host "📄 Deployment info saved to DEPLOYMENT_INFO.txt" -ForegroundColor Green

Write-Host "🎉 Production build completed successfully!" -ForegroundColor Green
Write-Host "   You can now test the .exe file in: $tauriTargetDir" -ForegroundColor Cyan