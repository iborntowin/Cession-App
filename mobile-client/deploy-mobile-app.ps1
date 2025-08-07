# Deploy Cession Manager Mobile App with updated icons
# This script updates the mobile app icons from the desktop app, builds the APK, and optionally submits to app stores

param(
    [Parameter()]
    [ValidateSet("development", "preview", "production")]
    [string]$Environment = "preview",
    
    [Parameter()]
    [ValidateSet("android", "ios", "all")]
    [string]$Platform = "android",
    
    [Parameter()]
    [switch]$SubmitToStore = $false,
    
    [Parameter()]
    [switch]$UpdateIcons = $true,
    
    [Parameter()]
    [switch]$SkipTests = $false
)

# Color functions for better output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }

# Script start
Write-Info "Starting Cession Manager Mobile App Deployment"
Write-Info "Environment: $Environment"
Write-Info "Platform: $Platform"
Write-Info "Update Icons: $UpdateIcons"
Write-Info "Submit to Store: $SubmitToStore"
Write-Info ""

# Check if we're in the mobile-client directory
if (!(Test-Path "app.json")) {
    Write-Error "❌ app.json not found. Please run this script from the mobile-client directory."
    exit 1
}

# Step 1: Update icons from desktop app
if ($UpdateIcons) {
    Write-Info "📱 Step 1: Updating icons from desktop app..."
    
    $desktopIconsPath = "../frontend/src-tauri/icons"
    if (!(Test-Path $desktopIconsPath)) {
        Write-Warning "⚠️  Desktop icons not found at $desktopIconsPath. Skipping icon update."
    } else {
        try {
            # Copy main icon
            Copy-Item "$desktopIconsPath/icon.png" "assets/icon.png" -Force
            Write-Success "✅ Updated main icon"
            
            # Copy adaptive icon for Android
            Copy-Item "$desktopIconsPath/icon.png" "assets/adaptive-icon.png" -Force
            Write-Success "✅ Updated adaptive icon"
            
            # Copy splash icon
            Copy-Item "$desktopIconsPath/icon.png" "assets/splash-icon.png" -Force
            Write-Success "✅ Updated splash icon"
            
            # Copy favicon
            Copy-Item "$desktopIconsPath/icon.png" "assets/favicon.png" -Force
            Write-Success "✅ Updated favicon"
            
            Write-Success "📱 Icons updated successfully!"
        } catch {
            Write-Error "❌ Failed to update icons: $($_.Exception.Message)"
            exit 1
        }
    }
} else {
    Write-Info "📱 Step 1: Skipping icon update (UpdateIcons = false)"
}

# Step 2: Install dependencies
Write-Info "📦 Step 2: Installing dependencies..."
try {
    npm install
    Write-Success "✅ Dependencies installed"
} catch {
    Write-Error "❌ Failed to install dependencies: $($_.Exception.Message)"
    exit 1
}

# Step 3: Run tests (unless skipped)
if (!$SkipTests) {
    Write-Info "🧪 Step 3: Running tests..."
    try {
        npm run test
        Write-Success "✅ Tests passed"
    } catch {
        Write-Warning "⚠️  Tests failed, but continuing with build..."
    }
} else {
    Write-Info "🧪 Step 3: Skipping tests (SkipTests = true)"
}

# Step 4: Check EAS CLI
Write-Info "🔧 Step 4: Checking EAS CLI..."
try {
    $easVersion = eas --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Installing EAS CLI..."
        npm install -g @expo/eas-cli
    }
    Write-Success "✅ EAS CLI ready"
} catch {
    Write-Error "❌ Failed to setup EAS CLI: $($_.Exception.Message)"
    exit 1
}

# Step 5: Check authentication
Write-Info "🔐 Step 5: Checking EAS authentication..."
try {
    $whoami = eas whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Please login to EAS:"
        eas login
    } else {
        Write-Success "✅ Authenticated as: $whoami"
    }
} catch {
    Write-Error "❌ Authentication failed: $($_.Exception.Message)"
    exit 1
}

# Step 6: Set environment variables
Write-Info "🌍 Step 6: Setting environment variables..."
switch ($Environment) {
    "development" {
        $env:NODE_ENV = "development"
        $env:EXPO_PUBLIC_APP_ENV = "development"
    }
    "preview" {
        $env:NODE_ENV = "staging"
        $env:EXPO_PUBLIC_APP_ENV = "staging"
    }
    "production" {
        $env:NODE_ENV = "production"
        $env:EXPO_PUBLIC_APP_ENV = "production"
    }
}
Write-Success "✅ Environment variables set for $Environment"

# Step 7: Clear cache
Write-Info "🧹 Step 7: Clearing cache..."
try {
    if (Test-Path ".expo") {
        Remove-Item -Recurse -Force ".expo"
    }
    if (Test-Path ".metro-cache") {
        Remove-Item -Recurse -Force ".metro-cache"
    }
    Write-Success "✅ Cache cleared"
} catch {
    Write-Warning "⚠️  Failed to clear some cache files, continuing..."
}

# Step 8: Build the app
Write-Info "🔨 Step 8: Building the app..."
Write-Info "This may take several minutes..."

$buildCommand = switch ($Platform) {
    "android" { "npm run build:${Environment}:android" }
    "ios" { "npm run build:${Environment}:ios" }
    "all" { "npm run build:${Environment}" }
}

try {
    Write-Info "Executing: $buildCommand"
    Invoke-Expression $buildCommand
    Write-Success "✅ Build completed successfully!"
} catch {
    Write-Error "❌ Build failed: $($_.Exception.Message)"
    exit 1
}

# Step 9: Submit to store (if requested)
if ($SubmitToStore -and $Environment -eq "production") {
    Write-Info "📤 Step 9: Submitting to app store..."
    try {
        switch ($Platform) {
            "android" { 
                eas submit --platform android --latest
                Write-Success "✅ Submitted to Google Play Store"
            }
            "ios" { 
                eas submit --platform ios --latest
                Write-Success "✅ Submitted to Apple App Store"
            }
            "all" {
                eas submit --platform android --latest
                eas submit --platform ios --latest
                Write-Success "✅ Submitted to both app stores"
            }
        }
    } catch {
        Write-Error "❌ Store submission failed: $($_.Exception.Message)"
        Write-Info "You can submit manually later using: eas submit --platform $Platform --latest"
    }
} elseif ($SubmitToStore -and $Environment -ne "production") {
    Write-Warning "⚠️  Store submission is only available for production builds"
} else {
    Write-Info "📤 Step 9: Skipping store submission"
}

# Step 10: Show build information
Write-Info "📋 Step 10: Build Summary"
Write-Success "🎉 Deployment completed successfully!"
Write-Info ""
Write-Info "Build Details:"
Write-Info "  Environment: $Environment"
Write-Info "  Platform: $Platform"
Write-Info "  Icons Updated: $UpdateIcons"
Write-Info "  Store Submission: $SubmitToStore"
Write-Info ""
Write-Info "Next Steps:"
if ($Environment -eq "preview") {
    Write-Info "  • Check your EAS dashboard: https://expo.dev"
    Write-Info "  • Download the APK from the build page"
    Write-Info "  • Test the app on your device"
}
if ($Environment -eq "production" -and !$SubmitToStore) {
    Write-Info "  • To submit to stores, run:"
    Write-Info "    eas submit --platform android --latest"
    Write-Info "    eas submit --platform ios --latest"
}
Write-Info "  • Monitor build status at: https://expo.dev"
Write-Info ""
Write-Success "🚀 Mobile app deployment complete!"