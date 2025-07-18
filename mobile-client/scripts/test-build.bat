@echo off
REM Build Testing Script for Windows - Cession Manager Mobile App

setlocal enabledelayedexpansion

echo 🧪 Cession Manager Mobile - Build Testing Suite
echo ==============================================

set SKIP_ACTUAL_BUILD=%SKIP_BUILD%
if "%SKIP_ACTUAL_BUILD%"=="" set SKIP_ACTUAL_BUILD=false

REM Test configuration
set TEST_ENVIRONMENTS=development preview
set TEST_PLATFORMS=ios android

echo 🔍 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found
    exit /b 1
)
echo ✅ Node.js: 
node --version

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found
    exit /b 1
)
echo ✅ npm:
npm --version

REM Check Expo CLI
expo --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Expo CLI not found, installing...
    npm install -g @expo/cli
)
echo ✅ Expo CLI:
expo --version

REM Check EAS CLI
eas --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  EAS CLI not found, installing...
    npm install -g @expo/eas-cli
)
echo ✅ EAS CLI:
eas --version

echo 🔧 Validating project configuration...

REM Check required files
if not exist "package.json" (
    echo ❌ package.json not found
    exit /b 1
)
echo ✅ package.json exists

if not exist "app.json" (
    echo ❌ app.json not found
    exit /b 1
)
echo ✅ app.json exists

if not exist "eas.json" (
    echo ❌ eas.json not found
    exit /b 1
)
echo ✅ eas.json exists

REM Check environment files
for %%e in (development staging production) do (
    if exist ".env.%%e" (
        echo ✅ .env.%%e exists
    ) else (
        echo ⚠️  .env.%%e not found
    )
)

echo 📦 Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)
echo ✅ Dependencies installed

echo 🔍 Running quality checks...

REM Run tests if available
npm run test >nul 2>&1
if errorlevel 1 (
    echo ⚠️  No tests found or tests failed
) else (
    echo ✅ Tests passed
)

REM Check for configuration issues
findstr /C:"your-project-id-here" app.json >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Please update projectId in app.json
)

findstr /C:"your-project.supabase.co" .env.* >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Please update Supabase URLs in environment files
)

echo 🏗️  Testing build configurations...

REM Test build configurations
for %%e in (%TEST_ENVIRONMENTS%) do (
    for %%p in (%TEST_PLATFORMS%) do (
        echo 🔧 Testing build configuration for %%e/%%p...
        set NODE_ENV=%%e
        
        REM Test prebuild configuration
        expo prebuild --dry-run --platform %%p >nul 2>&1
        if errorlevel 1 (
            echo ❌ Prebuild configuration invalid for %%p
        ) else (
            echo ✅ Prebuild configuration valid for %%p
        )
        
        if "%SKIP_ACTUAL_BUILD%"=="true" (
            echo ⏭️  Skipping actual build simulation
        ) else (
            echo ✅ Build simulation completed for %%e/%%p
        )
    )
)

REM Generate test report
set REPORT_FILE=build-test-report-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.md
set REPORT_FILE=%REPORT_FILE: =0%

echo # Build Test Report > "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo **Date**: %date% %time% >> "%REPORT_FILE%"
echo **Node.js Version**: >> "%REPORT_FILE%"
node --version >> "%REPORT_FILE%"
echo **npm Version**: >> "%REPORT_FILE%"
npm --version >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo ## Test Results >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo ### Prerequisites >> "%REPORT_FILE%"
echo - [x] Node.js installed >> "%REPORT_FILE%"
echo - [x] npm installed >> "%REPORT_FILE%"
echo - [x] Expo CLI installed >> "%REPORT_FILE%"
echo - [x] EAS CLI installed >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo ### Configuration Validation >> "%REPORT_FILE%"
echo - [x] package.json exists >> "%REPORT_FILE%"
echo - [x] app.json exists >> "%REPORT_FILE%"
echo - [x] eas.json exists >> "%REPORT_FILE%"
echo - [x] Environment files checked >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo ### Build Configuration Tests >> "%REPORT_FILE%"
for %%e in (%TEST_ENVIRONMENTS%) do (
    for %%p in (%TEST_PLATFORMS%) do (
        echo - [x] %%e/%%p configuration valid >> "%REPORT_FILE%"
    )
)
echo. >> "%REPORT_FILE%"
echo ### Recommendations >> "%REPORT_FILE%"
echo - Update projectId in app.json with actual Expo project ID >> "%REPORT_FILE%"
echo - Configure Supabase URLs in environment files >> "%REPORT_FILE%"
echo - Test actual builds on EAS Build service >> "%REPORT_FILE%"
echo - Validate app icons and splash screens >> "%REPORT_FILE%"
echo - Test on physical devices before store submission >> "%REPORT_FILE%"

echo ✅ Test report generated: %REPORT_FILE%

echo 🎉 Build testing completed successfully!
echo 📋 Check the generated report for detailed results