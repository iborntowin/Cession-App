#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Troubleshoot APK download issues for Cession Manager Mobile App
.DESCRIPTION
    This script helps diagnose and fix common APK download problems
#>

Write-Host "🔍 Troubleshooting APK Download Issues" -ForegroundColor Cyan
Write-Host ""

# Function to check build status
function Check-BuildStatus {
    Write-Host "📋 Checking your recent builds..." -ForegroundColor Blue
    try {
        Write-Host "Running: eas build:list --limit=5" -ForegroundColor Gray
        eas build:list --limit=5
        Write-Host ""
    } catch {
        Write-Host "❌ Failed to get build list. Make sure you're logged in to EAS." -ForegroundColor Red
        Write-Host "Try running: eas login" -ForegroundColor Yellow
        return $false
    }
    return $true
}

# Function to check authentication
function Check-Authentication {
    Write-Host "🔐 Checking EAS authentication..." -ForegroundColor Blue
    try {
        $whoami = eas whoami 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Authenticated as: $whoami" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Not authenticated with EAS" -ForegroundColor Red
            Write-Host "Please run: eas login" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ EAS CLI not found or not working" -ForegroundColor Red
        Write-Host "Please install EAS CLI: npm install -g @expo/eas-cli" -ForegroundColor Yellow
        return $false
    }
}

# Function to provide download instructions
function Show-DownloadInstructions {
    Write-Host "📱 How to Download Your APK:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Method 1: EAS Dashboard (Recommended)" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://expo.dev" -ForegroundColor White
    Write-Host "  2. Sign in with your Expo account" -ForegroundColor White
    Write-Host "  3. Click on your project: 'cession-manager-mobile'" -ForegroundColor White
    Write-Host "  4. Go to 'Builds' tab" -ForegroundColor White
    Write-Host "  5. Find your latest successful build" -ForegroundColor White
    Write-Host "  6. Click 'Download' button next to the APK" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Method 2: Direct Download Link" -ForegroundColor Yellow
    Write-Host "  If you have a build ID, you can get the download link:" -ForegroundColor White
    Write-Host "  eas build:view [BUILD_ID]" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Method 3: QR Code (for testing)" -ForegroundColor Yellow
    Write-Host "  Some builds provide QR codes for easy installation" -ForegroundColor White
    Write-Host "  Scan with your Android device to install directly" -ForegroundColor White
    Write-Host ""
}

# Function to check for common issues
function Check-CommonIssues {
    Write-Host "🔧 Checking for common issues..." -ForegroundColor Blue
    Write-Host ""
    
    # Check if build actually completed
    Write-Host "Issue 1: Build might still be in progress" -ForegroundColor Yellow
    Write-Host "  • Builds can take 10-20 minutes to complete" -ForegroundColor White
    Write-Host "  • Check build status in EAS dashboard" -ForegroundColor White
    Write-Host "  • Look for 'FINISHED' status, not 'IN_PROGRESS'" -ForegroundColor White
    Write-Host ""
    
    # Check build type
    Write-Host "Issue 2: Wrong build type" -ForegroundColor Yellow
    Write-Host "  • Make sure you built an APK, not an App Bundle" -ForegroundColor White
    Write-Host "  • APK builds use 'preview' or 'development' profile" -ForegroundColor White
    Write-Host "  • App Bundles are for Google Play Store only" -ForegroundColor White
    Write-Host ""
    
    # Check permissions
    Write-Host "Issue 3: Browser/Download restrictions" -ForegroundColor Yellow
    Write-Host "  • Try a different browser (Chrome, Firefox, Edge)" -ForegroundColor White
    Write-Host "  • Disable ad blockers temporarily" -ForegroundColor White
    Write-Host "  • Check if downloads are blocked by corporate firewall" -ForegroundColor White
    Write-Host ""
    
    # Check build errors
    Write-Host "Issue 4: Build might have failed" -ForegroundColor Yellow
    Write-Host "  • Check build logs in EAS dashboard" -ForegroundColor White
    Write-Host "  • Look for red error messages" -ForegroundColor White
    Write-Host "  • Common issues: authentication, dependencies, configuration" -ForegroundColor White
    Write-Host ""
}

# Function to suggest alternative approaches
function Show-Alternatives {
    Write-Host "🔄 Alternative Approaches:" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Option 1: Build a new APK" -ForegroundColor Yellow
    Write-Host "  .\build-apk.ps1" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Option 2: Use development build" -ForegroundColor Yellow
    Write-Host "  eas build --profile development --platform android" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Option 3: Local development" -ForegroundColor Yellow
    Write-Host "  npx expo start" -ForegroundColor Gray
    Write-Host "  # Then scan QR code with Expo Go app" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Option 4: Web version (for testing)" -ForegroundColor Yellow
    Write-Host "  npx expo start --web" -ForegroundColor Gray
    Write-Host ""
}

# Main troubleshooting flow
Write-Host "Starting APK download troubleshooting..." -ForegroundColor Blue
Write-Host ""

# Step 1: Check authentication
if (-not (Check-Authentication)) {
    Write-Host ""
    Write-Host "🚨 Authentication issue detected!" -ForegroundColor Red
    Write-Host "Please run 'eas login' first, then try again." -ForegroundColor Yellow
    exit 1
}

# Step 2: Check build status
Write-Host ""
if (-not (Check-BuildStatus)) {
    Write-Host ""
    Write-Host "🚨 Cannot access build information!" -ForegroundColor Red
    Write-Host "This might indicate an authentication or connectivity issue." -ForegroundColor Yellow
}

# Step 3: Show download instructions
Write-Host ""
Show-DownloadInstructions

# Step 4: Check common issues
Write-Host ""
Check-CommonIssues

# Step 5: Show alternatives
Write-Host ""
Show-Alternatives

# Final recommendations
Write-Host ""
Write-Host "🎯 Quick Fix Recommendations:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Check EAS Dashboard first: https://expo.dev" -ForegroundColor White
Write-Host "2. If no successful builds, run: .\build-apk.ps1" -ForegroundColor White
Write-Host "3. If build failed, check logs and try again" -ForegroundColor White
Write-Host "4. For immediate testing, use: npx expo start" -ForegroundColor White
Write-Host ""
Write-Host "Need more help? Check the build logs in your EAS dashboard!" -ForegroundColor Cyan