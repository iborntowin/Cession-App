# Set up paths
$backendProject = "C:\Tauri\backend"
$frontendProject = "C:\Tauri\frontend"
$deployRoot = "C:\cession-app-frontend"
$deployBackend = "$deployRoot\backend"

# 1. Build backend JAR
Write-Host "Building backend JAR..."
cd $backendProject
mvn clean package

# 2. Build frontend (Tauri)
Write-Host "Building frontend (Tauri)..."
cd $frontendProject
npm run tauri build

# 3. Prepare deployment folder
Write-Host "Preparing deployment folder..."
if (!(Test-Path $deployRoot)) { New-Item -ItemType Directory -Path $deployRoot }
if (!(Test-Path $deployBackend)) { New-Item -ItemType Directory -Path $deployBackend }

# 4. Copy backend JAR
Write-Host "Copying backend JAR..."
Copy-Item "$backendProject\target\cession-app-backend-0.0.1-SNAPSHOT.jar" "$deployBackend\" -Force

# 5. Copy frontend executable (Tauri app)
Write-Host "Copying frontend executable..."
$tauriExe = Get-ChildItem "$frontendProject\src-tauri\target\release\bundle\nsis\*.exe" | Select-Object -First 1
if ($tauriExe) {
    Copy-Item $tauriExe.FullName "$deployRoot\app.exe" -Force
} else {
    Write-Host "Tauri .exe not found! Please check your build."
}

Write-Host "Deployment complete!"
Write-Host "To run:"
Write-Host "1. Open a terminal in $deployBackend and run: java -jar cession-app-backend-0.0.1-SNAPSHOT.jar"
Write-Host "2. Double-click $deployRoot\\app.exe"