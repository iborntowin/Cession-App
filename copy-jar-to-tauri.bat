@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   COPYING JAR TO TAURI DIRECTORIES
echo ========================================
echo.

REM Define source JAR path
set "sourceJar=backend\target\cession-app-backend-0.0.1-SNAPSHOT.jar"

REM Check if source JAR exists
if not exist "%sourceJar%" (
    echo [ERROR] Source JAR not found: %sourceJar%
    echo Please build the backend first:
    echo   cd backend
    echo   mvn clean package
    pause
    exit /b 1
)

echo [OK] Source JAR found: %sourceJar%

REM Create the necessary directories
echo.
echo Creating Tauri directories...
set "dirs=frontend\src-tauri\backend frontend\src-tauri\target\debug\backend frontend\src-tauri\target\release\backend"

for %%d in (%dirs%) do (
    if not exist "%%d" (
        mkdir "%%d" 2>nul
        echo   [OK] Created: %%d
    )
)

REM Copy the JAR to all required locations
echo.
echo Copying JAR files...

set "destinations=frontend\src-tauri\backend\cession-app-backend-0.0.1-SNAPSHOT.jar frontend\src-tauri\backend\app.jar frontend\src-tauri\target\debug\backend\cession-app-backend-0.0.1-SNAPSHOT.jar frontend\src-tauri\target\debug\backend\app.jar frontend\src-tauri\target\release\backend\cession-app-backend-0.0.1-SNAPSHOT.jar frontend\src-tauri\target\release\backend\app.jar"

set copyCount=0
for %%f in (%destinations%) do (
    copy "%sourceJar%" "%%f" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] Copied to: %%f
        set /a copyCount+=1
    ) else (
        echo   [ERROR] Failed to copy to: %%f
    )
)

echo.
echo ========================================
echo   COPY OPERATION COMPLETED
echo ========================================

if %copyCount% equ 6 (
    echo [SUCCESS] All JAR files copied successfully!
    echo.
    echo JAR is now available in all Tauri locations:
    echo   • frontend\src-tauri\backend\ ^(resource location^)
    echo   • frontend\src-tauri\target\debug\backend\ ^(debug builds^)
    echo   • frontend\src-tauri\target\release\backend\ ^(release builds^)
    echo.
    echo You can now run:
    echo   npm run tauri dev
    echo   npm run tauri build
) else (
    echo [WARNING] Only %copyCount% out of 6 copies succeeded
    echo Some JAR files may not be available for Tauri
)

echo.
pause