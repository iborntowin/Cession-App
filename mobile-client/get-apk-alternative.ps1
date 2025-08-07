#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Alternative APK generation methods for Cession Manager Mobile App
.DESCRIPTION
    This script provides alternative ways to get an APK when the standard download doesn't work
#>

param(
    [Parameter()]
    [ValidateSet("expo-dev-client", "local-build", "web-version")]
    [string]$Method = "expo-dev-client"
)

Write-Host "🔄 Alternative APK Methods for Cession Manager Mobile" -ForegroundColor Cyan
Write-Host "Method: $Method" -ForegroundColor Yellow
Write-Host ""

switch ($Method) {
    "expo-dev-client" {
        Write-Host "📱 Method 1: Expo Development Client" -ForegroundColor Green
        Write-Host ""
        Write-Host "This method lets you test the app without building an APK:" -ForegroundColor White
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Install Expo Go app on your Android device from Google Play Store" -ForegroundColor White
        Write-Host "2. Make sure your phone and computer are on the same WiFi network" -ForegroundColor White
        Write-Host "3. Run the development server:" -ForegroundColor White
        Write-Host ""
        
        try {
            Write-Host "Starting Expo development server..." -ForegroundColor Blue
            Write-Host "A QR code will appear - scan it with the Expo Go app" -ForegroundColor Blue
            Write-Host ""
            Write-Host "Press Ctrl+C to stop the server when done testing" -ForegroundColor Yellow
            Write-Host ""
            
            # Start the expo development server
            npx expo start
            
        } catch {
            Write-Host "❌ Failed to start Expo server: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Try running these commands manually:" -ForegroundColor Yellow
            Write-Host "  npm install" -ForegroundColor Gray
            Write-Host "  npx expo start" -ForegroundColor Gray
        }
    }
    
    "local-build" {
        Write-Host "🔨 Method 2: Local Build (Advanced)" -ForegroundColor Green
        Write-Host ""
        Write-Host "This method builds the APK locally (requires Android SDK):" -ForegroundColor White
        Write-Host ""
        
        # Check if Android SDK is available
        $androidHome = $env:ANDROID_HOME
        if (-not $androidHome -or -not (Test-Path $androidHome)) {
            Write-Host "❌ Android SDK not found!" -ForegroundColor Red
            Write-Host ""
            Write-Host "To use local builds, you need:" -ForegroundColor Yellow
            Write-Host "1. Android Studio installed" -ForegroundColor White
            Write-Host "2. Android SDK configured" -ForegroundColor White
            Write-Host "3. ANDROID_HOME environment variable set" -ForegroundColor White
            Write-Host ""
            Write-Host "For easier setup, use Method 1 (expo-dev-client) instead." -ForegroundColor Cyan
            return
        }
        
        try {
            Write-Host "Preparing local build..." -ForegroundColor Blue
            
            # Prebuild the project
            Write-Host "Step 1: Prebuilding project..." -ForegroundColor Blue
            npx expo prebuild --platform android
            
            Write-Host "Step 2: Building APK..." -ForegroundColor Blue
            Set-Location android
            .\gradlew assembleDebug
            Set-Location ..
            
            $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
            if (Test-Path $apkPath) {
                Write-Host "✅ APK built successfully!" -ForegroundColor Green
                Write-Host "Location: $apkPath" -ForegroundColor White
                Write-Host ""
                Write-Host "You can now install this APK on your Android device." -ForegroundColor Cyan
            } else {
                Write-Host "❌ APK not found at expected location" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "❌ Local build failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Local builds are complex. Consider using Method 1 instead." -ForegroundColor Yellow
        }
    }
    
    "web-version" {
        Write-Host "🌐 Method 3: Web Version" -ForegroundColor Green
        Write-Host ""
        Write-Host "This runs the app in your browser for testing:" -ForegroundColor White
        Write-Host ""
        
        try {
            Write-Host "Starting web version..." -ForegroundColor Blue
            Write-Host "The app will open in your default browser" -ForegroundColor Blue
            Write-Host ""
            Write-Host "Note: Some mobile-specific features may not work in the browser" -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop the server when done testing" -ForegroundColor Yellow
            Write-Host ""
            
            # Start the web version
            npx expo start --web
            
        } catch {
            Write-Host "❌ Failed to start web version: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Try running these commands manually:" -ForegroundColor Yellow
            Write-Host "  npm install" -ForegroundColor Gray
            Write-Host "  npx expo start --web" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "📋 Summary of Methods:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Method 1 (expo-dev-client): Best for quick testing" -ForegroundColor White
Write-Host "  • No APK needed" -ForegroundColor Gray
Write-Host "  • Uses Expo Go app" -ForegroundColor Gray
Write-Host "  • Fastest setup" -ForegroundColor Gray
Write-Host ""
Write-Host "Method 2 (local-build): Creates actual APK" -ForegroundColor White
Write-Host "  • Requires Android SDK" -ForegroundColor Gray
Write-Host "  • More complex setup" -ForegroundColor Gray
Write-Host "  • Produces installable APK" -ForegroundColor Gray
Write-Host ""
Write-Host "Method 3 (web-version): Browser testing" -ForegroundColor White
Write-Host "  • Runs in browser" -ForegroundColor Gray
Write-Host "  • Limited mobile features" -ForegroundColor Gray
Write-Host "  • Good for UI testing" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Recommendation: Start with Method 1 for quick testing!" -ForegroundColor Green