@echo off
REM Mobile App Build Script for Windows
REM Usage: scripts\build.bat [environment] [platform]
REM Example: scripts\build.bat production ios

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
set PLATFORM=%2

if "%ENVIRONMENT%"=="" set ENVIRONMENT=development
if "%PLATFORM%"=="" set PLATFORM=all

echo 🚀 Building Cession Manager Mobile App
echo Environment: %ENVIRONMENT%
echo Platform: %PLATFORM%

REM Validate environment
if not "%ENVIRONMENT%"=="development" if not "%ENVIRONMENT%"=="preview" if not "%ENVIRONMENT%"=="production" (
    echo ❌ Invalid environment. Use: development, preview, or production
    exit /b 1
)

REM Validate platform
if not "%PLATFORM%"=="ios" if not "%PLATFORM%"=="android" if not "%PLATFORM%"=="all" (
    echo ❌ Invalid platform. Use: ios, android, or all
    exit /b 1
)

REM Check if EAS CLI is installed
eas --version >nul 2>&1
if errorlevel 1 (
    echo ❌ EAS CLI not found. Installing...
    npm install -g @expo/eas-cli
)

REM Login check
echo 🔐 Checking EAS authentication...
eas whoami >nul 2>&1
if errorlevel 1 (
    echo Please login to EAS:
    eas login
)

REM Set environment variables
if "%ENVIRONMENT%"=="development" set NODE_ENV=development
if "%ENVIRONMENT%"=="preview" set NODE_ENV=staging
if "%ENVIRONMENT%"=="production" set NODE_ENV=production

REM Start build
echo 🔨 Starting build process...
if "%PLATFORM%"=="all" (
    npm run build:%ENVIRONMENT%
) else (
    npm run build:%ENVIRONMENT%:%PLATFORM%
)

echo ✅ Build completed successfully!
echo 📱 Check your EAS dashboard for build status: https://expo.dev