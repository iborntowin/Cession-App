# Build script for Cession App
Write-Host "Building Cession App..." -ForegroundColor Green

# 1. Build Spring Boot backend
Write-Host "Building Spring Boot backend..." -ForegroundColor Yellow
Set-Location backend
mvn clean package
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build backend!" -ForegroundColor Red
    exit 1
}

# Create backend directory in Tauri resources if it doesn't exist
$resourcePath = "../frontend/src-tauri/backend"
if (-not (Test-Path $resourcePath)) {
    New-Item -ItemType Directory -Path $resourcePath
}

# Copy and rename the JAR
Copy-Item "target/cession-app-backend-*.jar" "../frontend/src-tauri/backend/app.jar" -Force
Write-Host "Backend JAR copied to Tauri resources" -ForegroundColor Green

# 2. Build Tauri frontend
Write-Host "Building Tauri frontend..." -ForegroundColor Yellow
Set-Location ../frontend

# Install npm dependencies
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install npm dependencies!" -ForegroundColor Red
    exit 1
}

# Build Tauri app
cargo tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Tauri app!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Installer can be found in: frontend/src-tauri/target/release/bundle/msi/" -ForegroundColor Cyan 