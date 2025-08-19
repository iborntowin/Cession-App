# PowerShell script for local full-stack deployment and packaging

# 1. Build the Svelte frontend
Write-Host 'Building Svelte frontend...'
Push-Location frontend
npm install
npm run build
Pop-Location

# 2. Copy frontend build output to backend static folder
Write-Host 'Copying frontend build to backend static folder...'
$staticPath = "backend/src/main/resources/static"
if (Test-Path $staticPath) { 
    Remove-Item $staticPath -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $staticPath | Out-Null
Copy-Item -Path "frontend/dist/*" -Destination $staticPath -Recurse -Force

# 3. Build the Spring Boot backend
Write-Host 'Building Spring Boot backend...'
Push-Location backend
mvn clean package
Pop-Location

# 4. Create deployment package
$deployDir = "deployment_package"
Write-Host "Creating deployment package in '$deployDir'..."

# Kill any running Java processes that might lock our files
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clean up old deployment directory
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# 5. Copy files to deployment package
Copy-Item "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar" $deployDir
Copy-Item "backend/src/main/resources/application.properties" $deployDir
if (Test-Path "backend/data") {
    Copy-Item "backend/data" -Destination "$deployDir/data" -Recurse
}

# 6. Create run_and_open.bat
$batContent = @'
@echo off
setlocal

REM === CONFIGURATION ===
set JAR=cession-app-backend-0.0.1-SNAPSHOT.jar
set PROPS=application.properties
set PORT=8082

REM === START THE APP ===
echo Starting backend...
start "" java -jar "%JAR%" --spring.config.location="%CD%\%PROPS%" > backend.log 2>&1

REM === WAIT FOR SERVER TO BE READY ===
echo Waiting for server to start on port %PORT%...
:waitloop
timeout /t 2 >nul
powershell -Command ^
    "$tcp = $null; try { $tcp = New-Object Net.Sockets.TcpClient('localhost', %PORT%) } catch {}; if ($tcp -and $tcp.Connected) { exit 0 } else { exit 1 }"
if errorlevel 1 goto waitloop

REM === OPEN DEFAULT BROWSER ===
echo Opening app in your default browser at http://localhost:%PORT%/
start http://localhost:%PORT%/

echo App is running! (See backend.log for output)
pause
'@
Set-Content -Path "$deployDir\run_and_open.bat" -Value $batContent -Encoding ASCII

Write-Host "Deployment package is ready in '$deployDir'. To run the app, double-click 'run_and_open.bat' on the target PC."

# 7. Create ZIP package
Write-Host 'Creating ZIP package...'
$zipPath = "deployment_package.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
}
Compress-Archive -Path "$deployDir\*" -DestinationPath $zipPath -Force
Write-Host "Created $zipPath"

